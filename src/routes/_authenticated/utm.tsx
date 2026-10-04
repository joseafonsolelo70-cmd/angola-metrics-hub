import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Panel, CopyButton } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/utm")({
  head: () => ({ meta: [{ title: "Gerador de UTMs — UTMify Angola" }] }),
  component: UtmPage,
});

const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function UtmPage() {
  const [url, setUrl] = useState("https://");
  const [v, setV] = useState<Record<string, string>>({ utm_source: "facebook", utm_medium: "cpc" });
  const result = useMemo(() => {
    try {
      const u = new URL(url);
      FIELDS.forEach((k) => v[k]?.trim() && u.searchParams.set(k, v[k].trim()));
      return u.toString();
    } catch { return ""; }
  }, [url, v]);
  return (
    <>
      <PageHeader title="Gerador de UTMs" description="Monte URLs com parâmetros UTM para as suas campanhas." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Parâmetros">
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>URL de destino</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} /></div>
            {FIELDS.map((k) => (
              <div key={k} className="space-y-1.5"><Label className="font-mono text-xs">{k}</Label><Input value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>
            ))}
          </div>
        </Panel>
        <Panel title="URL final">
          {result ? (
            <>
              <p className="break-all rounded-lg bg-muted p-3 font-mono text-xs">{result}</p>
              <div className="mt-3 flex gap-2"><CopyButton value={result} /></div>
            </>
          ) : <p className="text-sm text-destructive">Introduza uma URL válida.</p>}
          <div className="mt-6 rounded-lg border p-4 text-sm">
            <p className="font-medium">Precisa de um tracking link?</p>
            <p className="mt-1 text-muted-foreground">Um tracking link interno regista a visita, preserva UTMs e fbclid e entrega um <code>utmify_sid</code> ao seu site.</p>
            <Button asChild size="sm" className="mt-3"><Link to="/links">Criar tracking link</Link></Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
