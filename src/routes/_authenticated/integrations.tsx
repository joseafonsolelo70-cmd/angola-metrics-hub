import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader, Panel, LoadingRows, StatusBadge } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { saveMetaIntegration, testMetaIntegration } from "@/lib/meta.functions";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({ meta: [{ title: "Integrações — UTMify Angola" }] }),
  component: IntegrationsPage,
});

const EVENTS = ["PageView", "ViewContent", "Lead", "InitiateCheckout", "Purchase"] as const;
const ST: Record<string, string> = { connected: "Ligado", pending_test: "Por testar", error: "Erro", not_configured: "Não configurado" };

function IntegrationsPage() {
  const { data: ws } = useWorkspace();
  const qc = useQueryClient();
  const saveFn = useServerFn(saveMetaIntegration);
  const testFn = useServerFn(testMetaIntegration);
  const integ = useQuery({
    queryKey: ["integration", ws?.id], enabled: !!ws,
    queryFn: async () => (await supabase.from("integrations").select("*").eq("workspace_id", ws!.id).eq("provider", "meta").maybeSingle()).data,
  });
  const [pixel, setPixel] = useState(""); const [token, setToken] = useState("");
  const [events, setEvents] = useState<string[]>(["Purchase"]);
  useEffect(() => { if (integ.data) { setPixel(integ.data.pixel_id ?? ""); setEvents(integ.data.events); } }, [integ.data]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["integration"] });

  const save = useMutation({
    mutationFn: () => saveFn({ data: { workspace_id: ws!.id, pixel_id: pixel, access_token: token, events: events as (typeof EVENTS)[number][] } }),
    onSuccess: () => { toast.success("Guardado. Teste a ligação para ativar."); setToken(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const test = useMutation({
    mutationFn: () => testFn({ data: { workspace_id: ws!.id } }),
    onSuccess: (r) => { r.ok ? toast.success(r.message) : toast.error(r.message); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const i = integ.data;

  return (
    <>
      <PageHeader title="Integrações" description="Envie vendas aprovadas para a Meta via Conversions API." />
      <Panel title="Meta — Pixel e Conversions API" actions={<StatusBadge status={i?.status ?? "not_configured"} label={ST[i?.status ?? "not_configured"]} />}>
        {integ.isLoading ? <LoadingRows n={3} /> : (
          <form className="grid max-w-xl gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="space-y-1.5"><Label htmlFor="px">Pixel ID</Label><Input id="px" inputMode="numeric" value={pixel} onChange={(e) => setPixel(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="tk">Access Token da Conversions API</Label>
              <Input id="tk" type="password" autoComplete="off" placeholder={i?.token_last4 ? `Guardado (termina em ••••${i.token_last4}) — deixe vazio para manter` : "Cole o token"} value={token} onChange={(e) => setToken(e.target.value)} />
              <p className="text-xs text-muted-foreground">O token fica guardado apenas no servidor e nunca volta ao navegador.</p></div>
            <div className="space-y-2"><Label>Eventos</Label>
              <div className="flex flex-wrap gap-4">{EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm"><Checkbox checked={events.includes(ev)} onCheckedChange={(c) => setEvents(c ? [...events, ev] : events.filter((x) => x !== ev))} />{ev}</label>))}</div>
              <p className="text-xs text-muted-foreground">Nesta versão o servidor envia Purchase. Para deduplicar com o pixel do navegador, use o mesmo <code>event_id</code> no pixel e na venda enviada à API.</p></div>
            <div className="flex gap-2">
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "A guardar…" : "Guardar"}</Button>
              <Button type="button" variant="outline" disabled={test.isPending || !i?.pixel_id} onClick={() => test.mutate()}>{test.isPending ? "A testar…" : "Testar ligação"}</Button>
            </div>
            {i?.last_tested_at && <p className="text-xs text-muted-foreground">Último teste: {dateTime(i.last_tested_at)}{i.last_error && <span className="text-destructive"> — {i.last_error}</span>}</p>}
          </form>
        )}
      </Panel>
    </>
  );
}
