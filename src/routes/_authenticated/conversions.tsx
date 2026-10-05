import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { ShoppingBag, ChevronDown } from "lucide-react";
import { PageHeader, Panel, EmptyState, LoadingRows, ErrorBox, StatusBadge } from "@/components/app/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCampaigns, useConversions, useWorkspace } from "@/lib/workspace";
import { dateTime, kz, METHOD_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/conversions")({
  head: () => ({ meta: [{ title: "Conversões — UTMify Angola" }] }),
  component: ConversionsPage,
});

const CONV_STATUS: Record<string, string> = { approved: "Aprovada", pending: "Pendente", refunded: "Reembolsada" };
const CAPI: Record<string, string> = { sent: "Enviado", error: "Erro" };

function ConversionsPage() {
  const [days, setDays] = useState("30");
  const [status, setStatus] = useState("all");
  const [camp, setCamp] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const since = useMemo(() => (days === "all" ? undefined : new Date(Date.now() - Number(days) * 864e5).toISOString()), [days]);
  const { data: ws } = useWorkspace();
  const camps = useCampaigns(ws?.id);
  const convs = useConversions(ws?.id, since);
  const list = (convs.data ?? []).filter((c) => (status === "all" || c.status === status) && (camp === "all" || (camp === "none" ? !c.campaign_id : c.campaign_id === camp)));
  const campName = (id: string | null) => camps.data?.find((c) => c.id === id)?.name ?? "—";
  const total = list.filter((c) => c.status === "approved").reduce((a, c) => a + Number(c.value), 0);

  return (
    <>
      <PageHeader title="Conversões" description="Vendas recebidas pela API, com a atribuição explicada." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={days} onValueChange={setDays}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{["7", "30", "90"].map((d) => <SelectItem key={d} value={d}>Últimos {d} dias</SelectItem>)}<SelectItem value="all">Todo o período</SelectItem></SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos estados</SelectItem>{Object.entries(CONV_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={camp} onValueChange={setCamp}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas campanhas</SelectItem><SelectItem value="none">Sem campanha</SelectItem>{camps.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <div className="ml-auto self-center text-sm text-muted-foreground">{list.length} registos · receita aprovada <b className="text-foreground">{kz(total)}</b></div>
      </div>
      {convs.isLoading ? <LoadingRows /> : convs.error ? <ErrorBox error={convs.error} /> : !list.length ? (
        <EmptyState icon={ShoppingBag} title="Sem conversões" description="Quando o seu checkout enviar vendas para a API (ver Configurações), elas aparecem aqui." />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>{["Data", "Produto", "Valor", "Campanha", "Origem", "Atribuição", "Estado", "Meta CAPI", ""].map((h) => <th key={h} className="pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {list.map((c) => (
                <Fragment key={c.id}>
                  <tr className="cursor-pointer border-t hover:bg-muted/40" onClick={() => setOpen(open === c.id ? null : c.id)}>
                    <td className="whitespace-nowrap py-2.5 pr-4">{dateTime(c.occurred_at)}</td>
                    <td className="pr-4">{c.product ?? "—"}</td>
                    <td className="whitespace-nowrap pr-4 font-medium">{c.currency === "AOA" ? kz(c.value) : `${Number(c.value).toLocaleString("pt-AO")} ${c.currency}`}</td>
                    <td className="pr-4">{campName(c.campaign_id)}</td>
                    <td className="pr-4 capitalize">{c.source ?? "—"}</td>
                    <td className="pr-4">{METHOD_LABEL[c.attribution_method] ?? c.attribution_method}</td>
                    <td className="pr-4"><StatusBadge status={c.status} label={CONV_STATUS[c.status] ?? c.status} /></td>
                    <td className="pr-4">{c.meta_capi_status ? <StatusBadge status={c.meta_capi_status === "sent" ? "approved" : "error"} label={CAPI[c.meta_capi_status] ?? c.meta_capi_status} /> : <span className="text-xs text-muted-foreground">Não enviado</span>}</td>
                    <td><ChevronDown className={`size-4 transition-transform ${open === c.id ? "rotate-180" : ""}`} /></td>
                  </tr>
                  {open === c.id && (
                    <tr className="bg-muted/30"><td colSpan={9} className="p-4 text-xs">
                      <div className="grid gap-4 md:grid-cols-2">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                          {([["transaction_id", c.transaction_id], ["event_id", c.event_id], ["fbclid", c.fbclid], ["utm_source", c.utm_source], ["utm_medium", c.utm_medium], ["utm_campaign", c.utm_campaign], ["utm_content", c.utm_content], ["utm_term", c.utm_term], ["sessão", c.session_id], ["erro CAPI", c.meta_capi_error]] as const).map(([k, v]) => (
                            <Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="break-all font-mono">{v ?? "—"}</dd></Fragment>))}
                        </dl>
                        <div><p className="mb-1 font-medium">Caminho de atribuição</p><pre className="max-h-56 overflow-auto rounded-md border bg-background p-2">{JSON.stringify(c.attribution_path, null, 2)}</pre></div>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
