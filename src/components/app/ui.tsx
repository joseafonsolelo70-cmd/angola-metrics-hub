import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-card ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent text-accent-foreground"><Icon className="size-5" /></div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingRows({ n = 5 }: { n?: number }) {
  return <div className="space-y-2">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  return <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Erro: {error instanceof Error ? error.message : "falha ao carregar"}</div>;
}

export function DemoBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-2 rounded-xl border border-gold/50 bg-gold/15 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 font-medium"><FlaskConical className="size-4" /> Dados de demonstração — não representam vendas reais.</div>
      {children}
    </div>
  );
}

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado!"); }}
      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
      <Copy className="size-3.5" /> {label}
    </button>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  approved: "bg-success/15 text-success border-success/30",
  connected: "bg-success/15 text-success border-success/30",
  paused: "bg-warning/20 text-foreground border-warning/40",
  pending: "bg-warning/20 text-foreground border-warning/40",
  pending_test: "bg-warning/20 text-foreground border-warning/40",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  refunded: "bg-destructive/15 text-destructive border-destructive/30",
};
export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge variant="outline" className={STATUS_TONE[status] ?? "bg-muted text-muted-foreground"}>{label}</Badge>;
}
