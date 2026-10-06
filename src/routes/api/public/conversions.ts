import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { attribute, deriveSource, sendMetaPurchase } from "@/lib/tracking.server";

const s = z.string().trim().max(500).optional().nullable();
const Payload = z.object({
  event_name: z.literal("PURCHASE").default("PURCHASE"),
  transaction_id: z.string().trim().min(1).max(200),
  event_id: s,
  value: z.number().nonnegative().max(1e12),
  currency: z.string().length(3).default("AOA"),
  product: s,
  timestamp: z.string().datetime().optional(),
  status: z.enum(["approved", "pending", "refunded"]).default("approved"),
  session_id: s, fbclid: s, gclid: s, ttclid: s,
  utm_source: s, utm_medium: s, utm_campaign: s, utm_content: s, utm_term: s,
});

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/conversions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("x-utmify-key");
        if (!key || !/^[a-f0-9]{48}$/.test(key)) return json({ error: "Chave inválida" }, 401);
        let body: unknown;
        try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
        const parsed = Payload.safeParse(body);
        if (!parsed.success) return json({ error: "Payload inválido", details: parsed.error.flatten().fieldErrors }, 422);
        const p = parsed.data;

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: ws } = await db.from("workspaces").select("*").eq("ingest_key", key).maybeSingle();
        if (!ws) return json({ error: "Chave inválida" }, 401);

        const { data: dup } = await db.from("conversions").select("id").eq("workspace_id", ws.id).eq("transaction_id", p.transaction_id).maybeSingle();
        if (dup) return json({ ok: true, duplicate: true, id: dup.id });

        const occurred_at = p.timestamp ?? new Date().toISOString();
        const a = await attribute(db, ws, { ...p, occurred_at });
        const sess = a.session;
        let campaign_id = sess?.campaign_id ?? null;
        const utm = {
          utm_source: sess?.utm_source ?? p.utm_source ?? null, utm_medium: sess?.utm_medium ?? p.utm_medium ?? null,
          utm_campaign: sess?.utm_campaign ?? p.utm_campaign ?? null, utm_content: sess?.utm_content ?? p.utm_content ?? null,
          utm_term: sess?.utm_term ?? p.utm_term ?? null,
        };
        if (!campaign_id && a.method !== "unattributed" && utm.utm_campaign) {
          const { data: c } = await db.from("campaigns").select("id").eq("workspace_id", ws.id).eq("utm_campaign", utm.utm_campaign).limit(1).maybeSingle();
          campaign_id = c?.id ?? null;
        }
        const fbclid = sess?.fbclid ?? p.fbclid ?? null;
        const source = a.method === "unattributed" ? "direto" : deriveSource({ fbclid, gclid: sess?.gclid ?? p.gclid, ttclid: sess?.ttclid ?? p.ttclid, utm_source: utm.utm_source });

        const { data: conv, error } = await db.from("conversions").insert({
          workspace_id: ws.id, session_id: sess?.id ?? null, campaign_id, transaction_id: p.transaction_id,
          event_id: p.event_id ?? p.transaction_id, value: p.value, currency: p.currency.toUpperCase(), product: p.product ?? null,
          status: p.status, source, fbclid, ...utm, attribution_method: a.method, attribution_path: a.path, occurred_at,
        }).select("id").single();
        if (error) {
          if (error.code === "23505") return json({ ok: true, duplicate: true });
          console.error(error);
          return json({ error: "Falha ao gravar" }, 500);
        }
        await db.from("tracking_events").insert({ workspace_id: ws.id, session_id: sess?.id ?? null, event_name: "PURCHASE", event_id: p.event_id ?? p.transaction_id, payload: { transaction_id: p.transaction_id, value: p.value } });

        // Meta Conversions API (apenas se configurada e com evento Purchase ativo)
        const { data: integ } = await db.from("integrations").select("*").eq("workspace_id", ws.id).eq("provider", "meta").maybeSingle();
        let meta: string | null = null;
        let metaErr: string | null = null;
        if (integ?.pixel_id && integ.status === "connected" && integ.events.includes("Purchase") && p.status === "approved") {
          const { data: sec } = await db.from("integration_secrets").select("access_token").eq("integration_id", integ.id).maybeSingle();
          if (sec) {
            const r = await sendMetaPurchase({ pixelId: integ.pixel_id, token: sec.access_token, eventId: p.event_id ?? p.transaction_id, value: p.value, currency: p.currency.toUpperCase(), fbclid, eventTime: Math.floor(new Date(occurred_at).getTime() / 1000), product: p.product });
            meta = r.ok ? "sent" : "error";
            if (!r.ok) { metaErr = r.body; console.error("Meta CAPI", r.body); }
          } else { meta = "error"; metaErr = "Token da Conversions API em falta"; }
        }
        if (meta) await db.from("conversions").update({ meta_capi_status: meta, meta_capi_error: metaErr }).eq("id", conv.id);
        return json({ ok: true, id: conv.id, attribution: a.method, source, meta_capi: meta ?? "skipped" }, 201);
      },
    },
  },
});
