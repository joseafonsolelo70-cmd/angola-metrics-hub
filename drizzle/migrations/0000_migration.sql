
create type public.ws_role as enum ('owner','admin','member');
create type public.platform as enum ('meta','google','tiktok','other');
create type public.campaign_status as enum ('active','paused','ended','draft');
create type public.attribution_model as enum ('first_touch','last_touch');

create table public.profiles (id uuid primary key, full_name text, created_at timestamptz not null default now());
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'AOA',
  attribution_model public.attribution_model not null default 'last_touch',
  attribution_window_days int not null default 7 check (attribution_window_days between 1 and 90),
  ingest_key text not null unique default encode(gen_random_bytes(24),'hex'),
  created_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role public.ws_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, price numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  platform public.platform not null default 'meta',
  budget numeric(14,2) not null default 0,
  spend numeric(14,2) not null default 0,
  product text,
  status public.campaign_status not null default 'active',
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  created_at timestamptz not null default now()
);
create index on public.campaigns(workspace_id);
create index on public.campaigns(workspace_id, utm_campaign);
create table public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  slug text not null unique,
  name text not null,
  destination_url text not null,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.tracking_links(workspace_id);
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tracking_link_id uuid references public.tracking_links(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  fbclid text, gclid text, ttclid text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  landing_page text, referrer text, device text,
  created_at timestamptz not null default now()
);
create index on public.sessions(workspace_id, created_at desc);
create index on public.sessions(fbclid);
create index on public.sessions(gclid);
create index on public.sessions(ttclid);
create table public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  event_name text not null,
  event_id text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.tracking_events(workspace_id, created_at desc);
create index on public.tracking_events(session_id);
create table public.conversions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  transaction_id text not null,
  event_id text,
  event_name text not null default 'PURCHASE',
  value numeric(14,2) not null,
  currency text not null default 'AOA',
  product text,
  status text not null default 'approved',
  source text,
  fbclid text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  attribution_method text not null default 'unattributed',
  attribution_path jsonb not null default '[]',
  meta_capi_status text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, transaction_id)
);
create index on public.conversions(workspace_id, occurred_at desc);
create index on public.conversions(campaign_id);
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  pixel_id text,
  token_last4 text,
  events text[] not null default array['Purchase'],
  status text not null default 'not_configured',
  last_tested_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);
-- secrets: no client access at all
create table public.integration_secrets (
  integration_id uuid primary key references public.integrations(id) on delete cascade,
  access_token text not null
);
create table public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  day date not null,
  spend numeric(14,2) not null default 0,
  clicks int not null default 0,
  unique (campaign_id, day)
);
create index on public.daily_metrics(workspace_id, day);

-- grants
grant select, insert, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select, insert, update, delete on public.products, public.campaigns, public.tracking_links, public.daily_metrics to authenticated;
grant select on public.sessions, public.tracking_events, public.conversions, public.integrations to authenticated;
grant update on public.conversions to authenticated;
grant all on public.profiles, public.workspaces, public.workspace_members, public.products, public.campaigns, public.tracking_links, public.sessions, public.tracking_events, public.conversions, public.integrations, public.integration_secrets, public.daily_metrics to service_role;

create or replace function public.is_member(_ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id=_ws and user_id=auth.uid())
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.products enable row level security;
alter table public.campaigns enable row level security;
alter table public.tracking_links enable row level security;
alter table public.sessions enable row level security;
alter table public.tracking_events enable row level security;
alter table public.conversions enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_secrets enable row level security;
alter table public.daily_metrics enable row level security;

create policy "own profile" on public.profiles for all to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "member read ws" on public.workspaces for select to authenticated using (public.is_member(id));
create policy "member update ws" on public.workspaces for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
create policy "read own memberships" on public.workspace_members for select to authenticated using (user_id=auth.uid() or public.is_member(workspace_id));
create policy "ws products" on public.products for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "ws campaigns" on public.campaigns for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "ws links" on public.tracking_links for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "ws metrics" on public.daily_metrics for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "ws sessions read" on public.sessions for select to authenticated using (public.is_member(workspace_id));
create policy "ws events read" on public.tracking_events for select to authenticated using (public.is_member(workspace_id));
create policy "ws conv read" on public.conversions for select to authenticated using (public.is_member(workspace_id));
create policy "ws conv update" on public.conversions for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "ws integ read" on public.integrations for select to authenticated using (public.is_member(workspace_id));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  insert into public.workspaces(name) values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)) || ' — Workspace') returning id into ws;
  insert into public.workspace_members(workspace_id,user_id,role) values (ws,new.id,'owner');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
