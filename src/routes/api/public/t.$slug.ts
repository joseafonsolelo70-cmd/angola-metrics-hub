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

        const url = new URL(request.url);
        const q = url.searchParams;
        const utms = Object.fromEntries(UTM.map((k) => [k, clip(q.get(k)) ?? link[k]])) as Record<(typeof UTM)[number], string | null>;
        const dest = new URL(link.destination_url);

        const { data: session } = await supabaseAdmin.from("sessions").insert({
          workspace_id: link.workspace_id, tracking_link_id: link.id, campaign_id: link.campaign_id,
          fbclid: clip(q.get("fbclid")), gclid: clip(q.get("gclid")), ttclid: clip(q.get("ttclid")),
          ...utms, landing_page: dest.origin + dest.pathname, referrer: clip(request.headers.get("referer")),
          device: detectDevice(request.headers.get("user-agent") ?? ""),
        }).select("id").single();

        if (session) {
          await supabaseAdmin.from("tracking_events").insert({ workspace_id: link.workspace_id, session_id: session.id, event_name: "CLICK", payload: { slug } });
          await supabaseAdmin.from("tracking_links").update({ clicks: link.clicks + 1 }).eq("id", link.id);
        }

        for (const k of UTM) if (utms[k]) dest.searchParams.set(k, utms[k]!);
        for (const k of ["fbclid", "gclid", "ttclid"]) { const v = q.get(k); if (v) dest.searchParams.set(k, v); }
        if (session) dest.searchParams.set("utmify_sid", session.id);
        return new Response(null, { status: 302, headers: { Location: dest.toString(), "Cache-Control": "no-store" } });
      },
    },
  },
});
