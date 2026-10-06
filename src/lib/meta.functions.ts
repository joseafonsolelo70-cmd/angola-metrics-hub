import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENTS = ["PageView", "ViewContent", "Lead", "InitiateCheckout", "Purchase"] as const;

export const saveMetaIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      workspace_id: z.string().uuid(),
      pixel_id: z.string().trim().regex(/^\d{5,25}$/, "Pixel ID deve conter só números"),
      access_token: z.string().trim().min(20).max(1000).optional().or(z.literal("")),
      events: z.array(z.enum(EVENTS)).min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isMember } = await context.supabase.rpc("is_member", { _ws: data.workspace_id });
    if (!isMember) throw new Error("Sem permissão");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { workspace_id: data.workspace_id, provider: "meta", pixel_id: data.pixel_id, events: data.events, updated_at: new Date().toISOString() };
    // Qualquer alteração exige novo teste antes de voltar a "Ligado"
    patch.status = "pending_test";
    if (data.access_token) { patch.token_last4 = data.access_token.slice(-4); patch.status = "pending_test"; patch.last_error = null; }
    const { data: integ, error } = await supabaseAdmin.from("integrations").upsert(patch as never, { onConflict: "workspace_id,provider" }).select("id, token_last4").single();
    if (error) throw new Error(error.message);
    if (data.access_token) {
      await supabaseAdmin.from("integration_secrets").upsert({ integration_id: integ.id, access_token: data.access_token });
    } else if (!integ.token_last4) {
      await supabaseAdmin.from("integrations").update({ status: "not_configured" }).eq("id", integ.id);
    }
    return { ok: true };
  });

export const testMetaIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workspace_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isMember } = await context.supabase.rpc("is_member", { _ws: data.workspace_id });
    if (!isMember) throw new Error("Sem permissão");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integ } = await supabaseAdmin.from("integrations").select("*").eq("workspace_id", data.workspace_id).eq("provider", "meta").maybeSingle();
    if (!integ?.pixel_id) return { ok: false, message: "Integração não configurada: adicione o Pixel ID." };
    const { data: sec } = await supabaseAdmin.from("integration_secrets").select("access_token").eq("integration_id", integ.id).maybeSingle();
    if (!sec) return { ok: false, message: "Integração não configurada: adicione o token da Conversions API." };
    let ok = false, message = "";
    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(integ.pixel_id)}?fields=id,name&access_token=${encodeURIComponent(sec.access_token)}`);
      const b = (await r.json()) as { name?: string; error?: { message?: string } };
      ok = r.ok;
      message = ok ? `Ligado ao pixel “${b.name ?? integ.pixel_id}”.` : `A Meta recusou: ${b.error?.message ?? r.status}`;
    } catch {
      message = "Não foi possível contactar a Meta.";
    }
    await supabaseAdmin.from("integrations").update({ status: ok ? "connected" : "error", last_tested_at: new Date().toISOString(), last_error: ok ? null : message }).eq("id", integ.id);
    return { ok, message };
  });
