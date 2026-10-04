export function kz(v: number | null | undefined, opts: { compact?: boolean } = {}) {
  const n = Number(v ?? 0);
  const s = new Intl.NumberFormat("pt-AO", {
    maximumFractionDigits: opts.compact ? 1 : 0,
    notation: opts.compact ? "compact" : "standard",
  }).format(n);
  return `${s} Kz`;
}
export const num = (v: number | null | undefined) => new Intl.NumberFormat("pt-AO").format(Number(v ?? 0));
export const ratio = (v: number | null) => (v == null || !isFinite(v) ? "—" : `${v.toFixed(2)}x`);
export const dateTime = (d: string) =>
  new Date(d).toLocaleString("pt-AO", { dateStyle: "short", timeStyle: "short" });
export const shortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("pt-AO", { day: "2-digit", month: "short" });

export const PLATFORM_LABEL: Record<string, string> = { meta: "Meta", google: "Google", tiktok: "TikTok", other: "Outro" };
export const STATUS_LABEL: Record<string, string> = { active: "Ativa", paused: "Pausada", ended: "Encerrada", draft: "Rascunho" };
export const METHOD_LABEL: Record<string, string> = {
  session_id: "Sessão (ID)",
  first_touch: "Primeiro toque",
  last_touch: "Último toque",
  utm_params: "UTMs no payload",
  unattributed: "Não atribuída",
};
