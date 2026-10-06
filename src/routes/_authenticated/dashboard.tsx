import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, DemoBanner, StatusBadge, LoadingRows } from "@/components/app/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCampaigns, useConversions, useSessionsCount, useWorkspace } from "@/lib/workspace";
import { buildDemo } from "@/lib/demo";
import { kz, num, ratio, shortDate, PLATFORM_LABEL, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — UTMify Angola" }] }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const [days, setDays] = useState(30);
  const since = useMemo(() => new Date(Date.now() - days * 864e5).toISOString(), [days]);
  const { data: ws } = useWorkspace();
  const camps = useCampaigns(ws?.id);
  const convs = useConversions(ws?.id, since);
  const sess = useSessionsCount(ws?.id, since);
  const hasReal = (camps.data?.length ?? 0) > 0 || (convs.data?.length ?? 0) > 0;
  const [forceDemo, setForceDemo] = useState(false);
  const demo = forceDemo || (!camps.isLoading && !hasReal);

  const model = useMemo(() => {
    if (demo) {
      const d = buildDemo(days);
      return { campaigns: d.campaigns, conversions: d.conversions, clicksBy: d.clicksByCampaign, timeline: d.daily };
    }
    const campaigns = camps.data ?? [];
    const conversions = (convs.data ?? []).filter((c) => c.status === "approved");
    const clicksBy: Record<string, number> = {};
    (sess.data ?? []).forEach((s) => { if (s.campaign_id) clicksBy[s.campaign_id] = (clicksBy[s.campaign_id] ?? 0) + 1; });
    const map: Record<string, { day: string; spend: number; revenue: number; clicks: number }> = {};
    for (let i = days - 1; i >= 0; i--) { const k = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); map[k] = { day: k, spend: 0, revenue: 0, clicks: 0 }; }
    conversions.forEach((c) => { const k = c.occurred_at.slice(0, 10); if (map[k]) map[k].revenue += Number(c.value); });
    const totalSpend = campaigns.reduce((a, c) => a + Number(c.spend), 0);
    Object.values(map).forEach((m) => (m.spend = totalSpend / days));
    return { campaigns, conversions, clicksBy, timeline: Object.values(map) };
  }, [demo, days, camps.data, convs.data, sess.data]);

  const spend = model.campaigns.reduce((a, c) => a + Number(c.spend), 0);
  const revenue = model.conversions.reduce((a, c) => a + Number(c.value), 0);
  const clicks = Object.values(model.clicksBy).reduce((a, b) => a + b, 0);
  const attributed = model.conversions.filter((c) => c.attribution_method !== "unattributed");
  const sales = model.conversions.length;
  const kpis = [
    ["Investimento", kz(spend)], ["Cliques", num(clicks)], ["Conversões", num(attributed.length)], ["Vendas", num(sales)],
    ["Receita", kz(revenue)], ["ROAS", ratio(spend ? revenue / spend : null)], ["CPA", attributed.length ? kz(spend / attributed.length) : "—"], ["Lucro estimado", kz(revenue - spend)],
  ];
  const byCampaign = model.campaigns.map((c) => {
    const cv = model.conversions.filter((x) => x.campaign_id === c.id);
    const rev = cv.reduce((a, x) => a + Number(x.value), 0);
    return { ...c, sales: cv.length, revenue: rev, clicks: model.clicksBy[c.id] ?? 0 };
  });
  const bySource = Object.entries(model.conversions.reduce<Record<string, number>>((a, c) => { const k = c.source ?? "direto"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).map(([name, value]) => ({ name, value }));

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral das campanhas e vendas atribuídas."
        actions={
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{[7, 14, 30, 90].map((d) => <SelectItem key={d} value={String(d)}>Últimos {d} dias</SelectItem>)}</SelectContent>
          </Select>
        } />
      {demo && <DemoBanner>{hasReal && <span className="text-xs">A ver demonstração</span>}</DemoBanner>}
      {hasReal && <label className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={forceDemo} onCheckedChange={setForceDemo} /> Mostrar dados de demonstração</label>}
      {camps.isLoading ? <LoadingRows n={6} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map(([l, v]) => (
              <div key={l} className="rounded-xl border bg-card p-4 shadow-card">
                <p className="text-xs font-medium text-muted-foreground">{l}</p>
                <p className="mt-2 font-display text-xl font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel title="Receita vs investimento" className="lg:col-span-2">
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart data={model.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tickFormatter={shortDate} fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis tickFormatter={(v) => kz(v, { compact: true })} fontSize={11} width={70} stroke="var(--muted-foreground)" />
                    <Tooltip formatter={(v: number) => kz(v)} labelFormatter={shortDate} />
                    <Area dataKey="revenue" name="Receita" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} />
                    <Area dataKey="spend" name="Investimento" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Origem das vendas">
              <div className="h-64">
                {bySource.length ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={bySource} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                        {bySource.map((_, i) => <Cell key={i} fill={COLORS[i % 5]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">Sem vendas no período.</p>}
              </div>
            </Panel>
          </div>
          <Panel title="Conversões por campanha" className="mt-4">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={byCampaign}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Bar dataKey="sales" name="Vendas" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Campanhas" className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr>{["Campanha", "Plataforma", "Status", "Investimento", "Cliques", "Vendas", "Receita", "ROAS"].map((h) => <th key={h} className="pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {byCampaign.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2.5 pr-4 font-medium">{c.name}</td><td className="pr-4">{PLATFORM_LABEL[c.platform]}</td>
                    <td className="pr-4"><StatusBadge status={c.status} label={STATUS_LABEL[c.status] ?? c.status} /></td>
                    <td className="pr-4">{kz(c.spend)}</td><td className="pr-4">{num(c.clicks)}</td><td className="pr-4">{c.sales}</td>
                    <td className="pr-4">{kz(c.revenue)}</td><td>{ratio(Number(c.spend) ? c.revenue / Number(c.spend) : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </>
  );
}
