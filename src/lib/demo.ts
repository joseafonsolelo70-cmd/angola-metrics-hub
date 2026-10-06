// Dados de demonstração gerados apenas no navegador. Nunca são gravados na base de dados.
import type { Campaign, Conversion } from "./workspace";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function buildDemo(days: number) {
  const r = rng(42);
  const now = Date.now();
  const base = { workspace_id: "demo", created_at: new Date(now - 40 * 864e5).toISOString(), utm_content: null, utm_term: null };
  const campaigns: Campaign[] = [
    { ...base, id: "d1", name: "Kit Beleza — Conversão", platform: "meta", budget: 450000, spend: 0, product: "Kit Beleza Natural", status: "active", utm_source: "facebook", utm_medium: "cpc", utm_campaign: "kit-beleza-conv" },
    { ...base, id: "d2", name: "Curso Excel — Remarketing", platform: "meta", budget: 200000, spend: 0, product: "Curso Excel Pro", status: "active", utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "excel-rmkt" },
    { ...base, id: "d3", name: "Pesquisa — Marca", platform: "google", budget: 150000, spend: 0, product: "Curso Excel Pro", status: "active", utm_source: "google", utm_medium: "cpc", utm_campaign: "marca-search" },
    { ...base, id: "d4", name: "TikTok — Teste Criativos", platform: "tiktok", budget: 120000, spend: 0, product: "Kit Beleza Natural", status: "paused", utm_source: "tiktok", utm_medium: "paid_social", utm_campaign: "tt-criativos" },
  ];
  const prices: Record<string, number> = { "Kit Beleza Natural": 18500, "Curso Excel Pro": 35000 };
  const weight = [0.4, 0.25, 0.2, 0.15];
  const daily: { day: string; spend: number; revenue: number; clicks: number }[] = [];
  const conversions: Conversion[] = [];
  const clicksByCampaign: Record<string, number> = {};
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(now - d * 864e5);
    let spend = 0, revenue = 0, clicks = 0;
    campaigns.forEach((c, i) => {
      if (c.status === "paused" && d < days / 3) return;
      const s = Math.round((c.budget / 30) * (0.7 + r() * 0.6));
      const cl = Math.round(s / (90 + r() * 60));
      c.spend += s; spend += s; clicks += cl;
      clicksByCampaign[c.id] = (clicksByCampaign[c.id] ?? 0) + cl;
      const sales = Math.floor(cl * (0.01 + (weight[i] ?? 0.1) * 0.05) + r() * 1.2);
      for (let k = 0; k < sales; k++) {
        const v = prices[c.product ?? ""] ?? 20000;
        revenue += v;
        const hasFb = c.platform === "meta";
        conversions.push({
          id: `dc${conversions.length}`, workspace_id: "demo", session_id: `demo-s${conversions.length}`, campaign_id: c.id,
          transaction_id: `DEMO-${1000 + conversions.length}`, event_id: null, event_name: "PURCHASE", value: v, currency: "AOA",
          product: c.product, status: "approved", source: c.platform === "other" ? "outro" : c.platform,
          fbclid: hasFb ? `IwAR${Math.floor(r() * 1e9).toString(36)}` : null,
          utm_source: c.utm_source, utm_medium: c.utm_medium, utm_campaign: c.utm_campaign, utm_content: null, utm_term: null,
          attribution_method: r() > 0.3 ? "session_id" : "last_touch", attribution_path: [], meta_capi_status: null, meta_capi_error: null,
          occurred_at: new Date(day.getTime() - r() * 864e5 * 0.9).toISOString(), created_at: day.toISOString(),
        });
      }
    });
    daily.push({ day: day.toISOString().slice(0, 10), spend, revenue, clicks });
  }
  // Algumas vendas sem tracking: não atribuídas
  for (let k = 0; k < Math.max(2, Math.floor(days / 6)); k++) {
    const first = conversions[0];
    if (!first) break;
    conversions.push({
      ...first, id: `du${k}`, campaign_id: null, session_id: null, fbclid: null, source: "direto",
      utm_source: null, utm_medium: null, utm_campaign: null, attribution_method: "unattributed",
      transaction_id: `DEMO-U${k}`, occurred_at: new Date(now - r() * days * 864e5).toISOString(),
    });
  }
  conversions.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return { campaigns, conversions, daily, clicksByCampaign };
}
