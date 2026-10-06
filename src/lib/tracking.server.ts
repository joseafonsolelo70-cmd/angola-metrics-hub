import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;
type Session = Database["public"]["Tables"]["sessions"]["Row"];

const META = ["facebook", "fb", "instagram", "ig", "meta"];

export function deriveSource(p: { fbclid?: string | null; gclid?: string | null; ttclid?: string | null; utm_source?: string | null }) {
  const s = (p.utm_source ?? "").toLowerCase();
  if (p.fbclid || META.includes(s)) return "meta";
  if (p.gclid || s === "google") return "google";
  if (p.ttclid || s === "tiktok") return "tiktok";
  return s || "direto";
}

export function detectDevice(ua: string) {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AttributionInput {
  session_id?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  occurred_at: string;
}

/**
 * Atribuição transparente:
 * 1) ID de sessão (prioridade máxima) dentro da janela
 * 2) Sessões com o mesmo fbclid/gclid/ttclid dentro da janela → primeiro ou último toque
 * 3) UTMs enviados no próprio payload
 * 4) Caso contrário: não atribuída (nunca inferimos pela data)
 */
export async function attribute(db: DB, ws: Database["public"]["Tables"]["workspaces"]["Row"], input: AttributionInput) {
  const end = new Date(input.occurred_at);
  const start = new Date(end.getTime() - ws.attribution_window_days * 864e5).toISOString();
  const pathOf = (rows: Session[]) =>
    rows.map((s) => ({
      session_id: s.id, at: s.created_at, source: deriveSource(s), campaign_id: s.campaign_id,
      utm_campaign: s.utm_campaign, fbclid: s.fbclid, gclid: s.gclid, ttclid: s.ttclid,
    }));

  if (input.session_id && UUID_RE.test(input.session_id)) {
    const { data } = await db.from("sessions").select("*").eq("id", input.session_id).eq("workspace_id", ws.id)
      .gte("created_at", start).lte("created_at", end.toISOString()).maybeSingle();
    if (data) return { method: "session_id", session: data, path: pathOf([data]) };
  }

  const ors = (["fbclid", "gclid", "ttclid"] as const).filter((k) => input[k]).map((k) => `${k}.eq.${input[k]!.replace(/[,()]/g, "")}`);
  if (ors.length) {
    const { data } = await db.from("sessions").select("*").eq("workspace_id", ws.id).or(ors.join(","))
      .gte("created_at", start).lte("created_at", end.toISOString()).order("created_at").limit(50);
    if (data && data.length) {
      const chosen = ws.attribution_model === "first_touch" ? data[0] : data[data.length - 1];
      return { method: ws.attribution_model, session: chosen, path: pathOf(data) };
    }
  }

  if (input.utm_source || input.utm_campaign) {
    return { method: "utm_params", session: null, path: [{ source: deriveSource(input), utm_campaign: input.utm_campaign ?? null, from: "payload" }] };
  }
  return { method: "unattributed", session: null, path: [] };
}

export async function sendMetaPurchase(opts: {
  pixelId: string; token: string; eventId: string; value: number; currency: string; fbclid?: string | null; eventTime: number; product?: string | null;
}) {
  const user_data: Record<string, string> = {};
  if (opts.fbclid) user_data.fbc = `fb.1.${opts.eventTime * 1000}.${opts.fbclid}`;
  let res: Response;
  try { res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(opts.pixelId)}/events?access_token=${encodeURIComponent(opts.token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [{
        event_name: "Purchase", event_time: opts.eventTime, event_id: opts.eventId, action_source: "website", user_data,
        custom_data: { currency: opts.currency, value: opts.value, content_name: opts.product ?? undefined },
      }],
    }),
  }); } catch (e) { return { ok: false, body: `Falha de rede: ${safeSendError(e)}` }; }
  const body = await res.text();
  return { ok: res.ok, body: body.slice(0, 500) };
}

export function safeSendError(e: unknown) {
  return e instanceof Error ? e.message.slice(0, 300) : "Erro desconhecido";
}
