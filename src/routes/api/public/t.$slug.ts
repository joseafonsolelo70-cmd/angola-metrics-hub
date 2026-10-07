import { createFileRoute } from "@tanstack/react-router";
import { detectDevice } from "@/lib/tracking.server";

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const clip = (v: string | null) => (v ? v.slice(0, 500) : null);

export const Route = createFileRoute("/api/public/t/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const slug = params.slug.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
        const { data: link } = await supabaseAdmin.from("tracking_links").select("*").eq("slug", slug).maybeSingle();
        if (!link) return new Response("Link não encontrado", { status: 404 });
        if (!link.active) return new Response("Este link está desativado", { status: 410 });

        const url = new URL(request.url);
        const q = url.searchParams;
        const utms = Object.fromEntries(UTM.map((k) => [k, clip(q.get(k)) ?? link[k]])) as Record<(typeof UTM)[number], string | null>;
        let dest: URL;
        try { dest = new URL(link.destination_url); } catch { return new Response("Destino inválido", { status: 422 }); }
        if (dest.protocol !== "https:" && dest.protocol !== "http:") return new Response("Destino inválido", { status: 422 });

        // Dedupe: o mesmo browser no mesmo link dentro de 30 min reutiliza a sessão (cookie, sem IP)
        const cookieName = `utmify_s_${link.id.slice(0, 8)}`;
        const prev = (request.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(cookieName + "="))?.split("=")[1];
        let reused: { id: string } | null = null;
        if (prev && /^[0-9a-f-]{36}$/i.test(prev)) {
          const since = new Date(Date.now() - 30 * 60_000).toISOString();
          const { data } = await supabaseAdmin.from("sessions").select("id").eq("id", prev).eq("tracking_link_id", link.id).gte("created_at", since).maybeSingle();
          reused = data;
        }
        const { data: created } = reused ? { data: null } : await supabaseAdmin.from("sessions").insert({
          workspace_id: link.workspace_id, tracking_link_id: link.id, campaign_id: link.campaign_id,
          fbclid: clip(q.get("fbclid")), gclid: clip(q.get("gclid")), ttclid: clip(q.get("ttclid")),
          ...utms, landing_page: dest.origin + dest.pathname, referrer: clip(request.headers.get("referer")),
          device: detectDevice(request.headers.get("user-agent") ?? ""),
        }).select("id").single();

        const session = reused ?? created;
        if (created) {
          await supabaseAdmin.from("tracking_events").insert({ workspace_id: link.workspace_id, session_id: created.id, event_name: "CLICK", payload: { slug } });
          await supabaseAdmin.from("tracking_links").update({ clicks: link.clicks + 1 }).eq("id", link.id);
        }

        for (const k of UTM) if (utms[k]) dest.searchParams.set(k, utms[k]!);
        for (const k of ["fbclid", "gclid", "ttclid"]) { const v = q.get(k); if (v) dest.searchParams.set(k, v); }
        if (session) dest.searchParams.set("utmify_sid", session.id);
        const headers = new Headers({ Location: dest.toString(), "Cache-Control": "no-store" });
        if (created) headers.append("Set-Cookie", `${cookieName}=${created.id}; Max-Age=1800; Path=/; HttpOnly; SameSite=Lax; Secure`);
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
