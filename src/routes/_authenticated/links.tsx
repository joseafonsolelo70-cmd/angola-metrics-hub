import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, EmptyState, LoadingRows, ErrorBox, CopyButton, StatusBadge } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCampaigns, useWorkspace, type TrackingLink } from "@/lib/workspace";
import { num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/links")({
  head: () => ({ meta: [{ title: "Tracking links — UTMify Angola" }] }),
  component: LinksPage,
});

type Form = { name: string; destination_url: string; campaign_id: string; slug: string };
const randomSlug = () => Math.random().toString(36).slice(2, 9);

function LinksPage() {
  const { data: ws } = useWorkspace();
  const camps = useCampaigns(ws?.id);
  const qc = useQueryClient();
  const links = useQuery({
    queryKey: ["links", ws?.id], enabled: !!ws,
    queryFn: async () => { const { data, error } = await supabase.from("tracking_links").select("*").eq("workspace_id", ws!.id).order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
  const [edit, setEdit] = useState<{ id?: string; form: Form } | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkUrl = (slug: string) => `${origin}/api/public/t/${slug}`;
  const inval = () => qc.invalidateQueries({ queryKey: ["links"] });

  const save = useMutation({
    mutationFn: async ({ id, form }: { id?: string; form: Form }) => {
      let url: URL; try { url = new URL(form.destination_url.trim()); } catch { throw new Error("URL de destino inválida (inclua https://)."); }
      if (!/^https?:$/.test(url.protocol)) throw new Error("Use um URL http(s).");
      const slug = form.slug.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,64}$/.test(slug)) throw new Error("O slug deve ter 3–64 caracteres: letras, números, - ou _.");
      const camp = camps.data?.find((c) => c.id === form.campaign_id);
      const row = { workspace_id: ws!.id, name: form.name.trim() || slug, destination_url: url.toString(), slug, campaign_id: camp?.id ?? null,
        utm_source: camp?.utm_source ?? null, utm_medium: camp?.utm_medium ?? null, utm_campaign: camp?.utm_campaign ?? null, utm_content: camp?.utm_content ?? null, utm_term: camp?.utm_term ?? null };
      const { error } = id ? await supabase.from("tracking_links").update(row).eq("id", id) : await supabase.from("tracking_links").insert(row);
      if (error) throw new Error(error.code === "23505" ? "Este slug já está em uso. Escolha outro." : error.message);
    },
    onSuccess: (_, v) => { toast.success(v.id ? "Link atualizado" : "Link criado"); setEdit(null); inval(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async (l: TrackingLink) => { const { error } = await supabase.from("tracking_links").update({ active: !l.active }).eq("id", l.id); if (error) throw error; },
    onSuccess: inval, onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("tracking_links").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Link apagado"); inval(); },
    onError: (e: Error) => toast.error(e.message.includes("foreign key") ? "Este link já tem sessões registadas. Desative-o em vez de apagar." : e.message),
  });

  const open = (l?: TrackingLink) => setEdit(l ? { id: l.id, form: { name: l.name, destination_url: l.destination_url, campaign_id: l.campaign_id ?? "none", slug: l.slug } } : { form: { name: "", destination_url: "", campaign_id: "none", slug: randomSlug() } });
  const campName = (id: string | null) => camps.data?.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader title="Tracking links" description="Links curtos que registam cada clique e passam o ID de sessão ao seu site."
        actions={<Button onClick={() => open()}><Plus className="size-4" /> Novo link</Button>} />
      {links.isLoading ? <LoadingRows /> : links.error ? <ErrorBox error={links.error} /> : !links.data?.length ? (
        <EmptyState icon={Link2} title="Ainda sem tracking links" description="Crie um link e use-o nos seus anúncios em vez do URL direto." action={<Button onClick={() => open()}>Criar link</Button>} />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>{["Link", "Campanha", "Cliques", "Ativo", ""].map((h) => <th key={h} className="pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {links.data.map((l) => (
                <tr key={l.id} className="border-t align-top">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{l.name} {!l.active && <StatusBadge status="paused" label="Inativo" />}</p>
                    <p className="font-mono text-xs text-muted-foreground">{linkUrl(l.slug)}</p>
                    <p className="max-w-md truncate text-xs text-muted-foreground">→ {l.destination_url}</p>
                    <div className="mt-1.5"><CopyButton value={linkUrl(l.slug)} label="Copiar link" /></div>
                  </td>
                  <td className="pr-4">{campName(l.campaign_id)}</td>
                  <td className="pr-4 font-medium">{num(l.clicks)}</td>
                  <td className="pr-4"><Switch checked={l.active} onCheckedChange={() => toggle.mutate(l)} aria-label="Ativar link" /></td>
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => open(l)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Apagar" onClick={() => confirm(`Apagar “${l.name}”?`) && del.mutate(l.id)}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted-foreground">O destino recebe <code>utmify_sid</code> (ID de sessão), os UTMs e fbclid/gclid/ttclid. Envie o <code>utmify_sid</code> como <code>session_id</code> na venda para atribuição exata. Cliques repetidos do mesmo navegador em 30 min contam uma vez.</p>
        </Panel>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar link" : "Novo tracking link"}</DialogTitle></DialogHeader>
          {edit && (
            <form id="lnk" className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ id: edit.id, form: { ...edit.form, campaign_id: edit.form.campaign_id === "none" ? "" : edit.form.campaign_id } }); }}>
              <div className="space-y-1.5"><Label htmlFor="dest">URL de destino *</Label><Input id="dest" placeholder="https://loja.ao/produto" value={edit.form.destination_url} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, destination_url: e.target.value } })} /></div>
              <div className="space-y-1.5"><Label htmlFor="nm">Nome</Label><Input id="nm" value={edit.form.name} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, name: e.target.value } })} /></div>
              <div className="space-y-1.5"><Label>Campanha (os UTMs dela são aplicados)</Label>
                <Select value={edit.form.campaign_id} onValueChange={(v) => setEdit({ ...edit, form: { ...edit.form, campaign_id: v } })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem campanha</SelectItem>{camps.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="sl">Slug</Label><Input id="sl" value={edit.form.slug} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, slug: e.target.value } })} /><p className="text-xs text-muted-foreground">{linkUrl(edit.form.slug || "…")}</p></div>
            </form>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button form="lnk" type="submit" disabled={save.isPending}>{save.isPending ? "A guardar…" : "Guardar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
