ALTER TABLE public.tracking_links ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.conversions ADD COLUMN IF NOT EXISTS meta_capi_error text;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS test_event_code text;
CREATE INDEX IF NOT EXISTS conversions_status_idx ON public.conversions(workspace_id, status);

CREATE OR REPLACE FUNCTION public.ensure_workspace()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare ws uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select workspace_id into ws from public.workspace_members where user_id = uid order by created_at limit 1;
  if ws is not null then return ws; end if;
  insert into public.profiles(id) values (uid) on conflict (id) do nothing;
  insert into public.workspaces(name) values ('Meu workspace') returning id into ws;
  insert into public.workspace_members(workspace_id,user_id,role) values (ws,uid,'owner');
  return ws;
end $$;
REVOKE ALL ON FUNCTION public.ensure_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO authenticated;