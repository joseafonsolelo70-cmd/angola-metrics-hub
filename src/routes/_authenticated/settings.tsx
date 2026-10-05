import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, Panel, CopyButton, LoadingRows } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — UTMify Angola" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: ws, isLoading } = useWorkspace();
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [model, setModel] = useState<"first_touch" | "last_touch">("last_touch"); const [win, setWin] = useState("7");
  useEffect(() => { if (ws) { setName(ws.name); setModel(ws.attribution_model); setWin(String(ws.attribution_window_days)); } }, [ws]);
  const save = useMutation({
    mutationFn: async () => {
      const w = Number(win); if (!Number.isInteger(w) || w < 1 || w > 90) throw new Error("A janela deve ser entre 1 e 90 dias.");
      const { error } = await supabase.from("workspaces").update({ name: name.trim() || ws!.name, attribution_model: model, attribution_window_days: w }).eq("id", ws!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações guardadas"); qc.invalidateQueries({ queryKey: ["workspace"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading || !ws) return <LoadingRows />;
  const endpoint = `${window.location.origin}/api/public/conversions`;
  const curl = `curl -X POST ${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -H "x-utmify-key: ${ws.ingest_key}" \\\n  -d '{"transaction_id":"PED-1001","value":25000,"currency":"AOA","product":"Produto","session_id":"<utmify_sid>","event_id":"PED-1001"}'`;

  return (
    <>
      <PageHeader title="Configurações" description="Workspace, modelo de atribuição e API de vendas." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Workspace e atribuição">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="space-y-1.5"><Label htmlFor="n">Nome</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Modelo (quando há vários cliques)</Label>
              <Select value={model} onValueChange={(v) => setModel(v as typeof model)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="last_touch">Último toque</SelectItem><SelectItem value="first_touch">Primeiro toque</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="w">Janela de atribuição (dias)</Label><Input id="w" type="number" min={1} max={90} value={win} onChange={(e) => setWin(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Ordem: ID de sessão → fbclid/gclid/ttclid → UTMs enviados. Sem nenhum destes, a venda fica “não atribuída”.</p>
            <Button type="submit" disabled={save.isPending}>Guardar</Button>
          </form>
        </Panel>
        <Panel title="API de vendas">
          <p className="mb-2 text-sm">Chave do workspace (secreta — use só no servidor do seu checkout):</p>
          <div className="mb-4 flex items-center gap-2"><code className="truncate rounded bg-muted px-2 py-1 text-xs">{ws.ingest_key}</code><CopyButton value={ws.ingest_key} /></div>
          <p className="mb-2 text-sm">Exemplo de envio de venda:</p>
          <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs">{curl}</pre>
          <div className="mt-2"><CopyButton value={curl} label="Copiar exemplo" /></div>
          <p className="mt-3 text-xs text-muted-foreground">Reenviar o mesmo transaction_id não duplica a venda.</p>
        </Panel>
      </div>
    </>
  );
}
