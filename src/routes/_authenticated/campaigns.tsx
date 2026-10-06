import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, EmptyState, LoadingRows, ErrorBox, StatusBadge } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCampaigns, useWorkspace, type Campaign } from "@/lib/workspace";
import { kz, PLATFORM_LABEL, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Campanhas — UTMify Angola" }] }),
  component: CampaignsPage,
});

type Form = Pick<Campaign, "name" | "platform" | "status"> & { budget: string; spend: string; product: string; utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string; utm_term: string };
const EMPTY: Form = { name: "", platform: "meta", status: "active", budget: "0", spend: "0", product: "", utm_source: "facebook", utm_medium: "cpc", utm_campaign: "", utm_content: "", utm_term: "" };
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function CampaignsPage() {
  const { data: ws } = useWorkspace();
  const camps = useCampaigns(ws?.id);
  const qc = useQueryClient();
  const [edit, setEdit] = useState<{ id?: string; form: Form } | null>(null);
  const [q, setQ] = useState("");
  const [metric, setMetric] = useState<{ campaign: Campaign; day: string; spend: string; clicks: string } | null>(null);
  const saveMetric = useMutation({
    mutationFn: async (m: NonNullable<typeof metric>) => {
      const spend = Number(m.spend), clicks = Number(m.clicks || 0);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(m.day)) throw new Error("Data inválida.");
      if (!(spend >= 0) || !(clicks >= 0) || !Number.isInteger(clicks)) throw new Error("Valores inválidos.");
      const { error } = await supabase.from("daily_metrics").upsert({ workspace_id: ws!.id, campaign_id: m.campaign.id, day: m.day, spend, clicks }, { onConflict: "campaign_id,day" });
      if (error) throw error;
      // Mantém o total da campanha igual à soma dos dias registados
      const { data: all } = await supabase.from("daily_metrics").select("spend").eq("campaign_id", m.campaign.id);
      const total = (all ?? []).reduce((a, r) => a + Number(r.spend), 0);
      await supabase.from("campaigns").update({ spend: total }).eq("id", m.campaign.id);
    },
    onSuccess: () => { toast.success("Investimento registado"); setMetric(null); qc.invalidateQueries({ queryKey: ["campaigns"] }); qc.invalidateQueries({ queryKey: ["daily_metrics"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");

  const list = useMemo(() => (camps.data ?? []).filter((c) =>
    (platform === "all" || c.platform === platform) && (status === "all" || c.status === status) &&
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.utm_campaign ?? "").includes(q.toLowerCase()))), [camps.data, q, platform, status]);

  const save = useMutation({
    mutationFn: async ({ id, form }: { id?: string; form: Form }) => {
      if (!form.name.trim()) throw new Error("Indique o nome da campanha.");
      const budget = Number(form.budget), spend = Number(form.spend);
      if (!(budget >= 0) || !(spend >= 0)) throw new Error("Orçamento e investimento devem ser números positivos.");
      const n = (v: string) => v.trim() || null;
      const row = { workspace_id: ws!.id, name: form.name.trim(), platform: form.platform, status: form.status, budget, product: n(form.product),
        utm_source: n(form.utm_source), utm_medium: n(form.utm_medium), utm_campaign: n(form.utm_campaign) ?? slugify(form.name), utm_content: n(form.utm_content), utm_term: n(form.utm_term) };
      const { error } = id ? await supabase.from("campaigns").update(row).eq("id", id) : await supabase.from("campaigns").insert(row);
      if (error) throw error;
    },
    onSuccess: (_, v) => { toast.success(v.id ? "Campanha atualizada" : "Campanha criada"); setEdit(null); qc.invalidateQueries({ queryKey: ["campaigns"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("campaigns").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Campanha apagada"); qc.invalidateQueries({ queryKey: ["campaigns"] }); },
    onError: (e: Error) => toast.error(e.message.includes("foreign key") ? "Esta campanha tem conversões ou links associados." : e.message),
  });

  const open = (c?: Campaign) => setEdit(c ? { id: c.id, form: { name: c.name, platform: c.platform, status: c.status, budget: String(c.budget), spend: String(c.spend), product: c.product ?? "", utm_source: c.utm_source ?? "", utm_medium: c.utm_medium ?? "", utm_campaign: c.utm_campaign ?? "", utm_content: c.utm_content ?? "", utm_term: c.utm_term ?? "" } } : { form: EMPTY });

  return (
    <>
      <PageHeader title="Campanhas" description="As campanhas do seu workspace e os UTMs usados para as identificar."
        actions={<Button onClick={() => open()}><Plus className="size-4" /> Nova campanha</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Pesquisar…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
        <Select value={platform} onValueChange={setPlatform}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas plataformas</SelectItem>{Object.entries(PLATFORM_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos estados</SelectItem>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
      </div>
      {camps.isLoading ? <LoadingRows /> : camps.error ? <ErrorBox error={camps.error} /> : !camps.data?.length ? (
        <EmptyState icon={Megaphone} title="Ainda sem campanhas" description="Crie a primeira campanha para começar a ligar cliques e vendas." action={<Button onClick={() => open()}>Criar campanha</Button>} />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>{["Campanha", "Plataforma", "Estado", "Orçamento", "Investimento", "utm_campaign", ""].map((h) => <th key={h} className="pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2.5 pr-4"><p className="font-medium">{c.name}</p>{c.product && <p className="text-xs text-muted-foreground">{c.product}</p>}</td>
                  <td className="pr-4">{PLATFORM_LABEL[c.platform]}</td>
                  <td className="pr-4"><StatusBadge status={c.status} label={STATUS_LABEL[c.status] ?? c.status} /></td>
                  <td className="pr-4">{kz(c.budget)}</td><td className="pr-4">{kz(c.spend)}</td>
                  <td className="pr-4 font-mono text-xs">{c.utm_campaign ?? "—"}</td>
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon" aria-label="Investimento diário" title="Investimento diário" onClick={() => setMetric({ campaign: c, day: new Date().toISOString().slice(0, 10), spend: "", clicks: "" })}><CalendarPlus className="size-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => open(c)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Apagar" onClick={() => confirm(`Apagar “${c.name}”?`) && del.mutate(c.id)}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Nenhuma campanha corresponde aos filtros.</td></tr>}
            </tbody>
          </table>
        </Panel>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar campanha" : "Nova campanha"}</DialogTitle></DialogHeader>
          {edit && (
            <form id="camp" className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }}>
              {(() => {
                const f = edit.form; const set = (k: keyof Form) => (v: string) => setEdit({ ...edit, form: { ...f, [k]: v } });
                const field = (k: keyof Form, label: string, type = "text") => (
                  <div className="space-y-1.5"><Label htmlFor={k}>{label}</Label><Input id={k} type={type} value={f[k]} onChange={(e) => set(k)(e.target.value)} /></div>);
                return (<>
                  <div className="sm:col-span-2">{field("name", "Nome *")}</div>
                  <div className="space-y-1.5"><Label>Plataforma</Label><Select value={f.platform} onValueChange={set("platform")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PLATFORM_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Estado</Label><Select value={f.status} onValueChange={set("status")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  {field("budget", "Orçamento (Kz)", "number")}<div className="space-y-1.5"><Label>Investimento gasto</Label><p className="pt-2 text-sm">{kz(Number(f.spend))} <span className="text-xs text-muted-foreground">(soma do investimento diário)</span></p></div>
                  <div className="sm:col-span-2">{field("product", "Produto")}</div>
                  {field("utm_source", "utm_source")}{field("utm_medium", "utm_medium")}
                  {field("utm_campaign", "utm_campaign (vazio = gerado do nome)")}{field("utm_content", "utm_content")}{field("utm_term", "utm_term")}
                </>);
              })()}
            </form>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button form="camp" type="submit" disabled={save.isPending}>{save.isPending ? "A guardar…" : "Guardar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!metric} onOpenChange={(o) => !o && setMetric(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Investimento diário — {metric?.campaign.name}</DialogTitle></DialogHeader>
          {metric && (
            <form id="metric" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); saveMetric.mutate(metric); }}>
              <div className="space-y-1.5"><Label htmlFor="mday">Dia</Label><Input id="mday" type="date" value={metric.day} onChange={(e) => setMetric({ ...metric, day: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="mspend">Investimento nesse dia (Kz)</Label><Input id="mspend" type="number" min="0" step="any" required value={metric.spend} onChange={(e) => setMetric({ ...metric, spend: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="mclicks">Cliques reportados pela plataforma (opcional)</Label><Input id="mclicks" type="number" min="0" value={metric.clicks} onChange={(e) => setMetric({ ...metric, clicks: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">Copie o valor gasto do Gestor de Anúncios. Registar o mesmo dia de novo substitui o valor.</p>
            </form>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setMetric(null)}>Cancelar</Button><Button form="metric" type="submit" disabled={saveMetric.isPending}>{saveMetric.isPending ? "A guardar…" : "Guardar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
