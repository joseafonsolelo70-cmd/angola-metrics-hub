import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UTMify Angola — Tracking e atribuição de vendas" },
      { name: "description", content: "Saiba que campanha gerou cada venda em Kwanza. UTMs, tracking links e Meta CAPI." },
      { property: "og:title", content: "UTMify Angola" },
      { property: "og:description", content: "Tracking de campanhas e atribuição de vendas para negócios angolanos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <Button asChild variant="outline"><Link to="/auth">Entrar</Link></Button>
      </header>
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center">
        <p className="mb-4 inline-block rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">Feito para gestores de tráfego em Angola</p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">Saiba que anúncio <span className="text-brand">vendeu</span>, em Kwanza.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">UTMs, links rastreados, atribuição transparente e envio de compras para a Meta — sem adivinhar.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth">Criar conta grátis</Link></Button>
        </div>
        <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {[
            ["Tracking links", "Preservam UTMs e fbclid e criam uma sessão por visita."],
            ["Atribuição auditável", "Primeiro ou último toque, com o caminho guardado."],
            ["Meta CAPI", "Envio de Purchase pelo servidor, sem expor tokens."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border bg-card p-5 shadow-card">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
