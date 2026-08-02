-- Tabela de tokens FCM por dispositivo (fonte de verdade para push)
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid,
  customer_id uuid,
  phone text,
  platform text default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.device_tokens to authenticated;
grant all on public.device_tokens to service_role;

alter table public.device_tokens enable row level security;

drop policy if exists "device_tokens_self_select" on public.device_tokens;
create policy "device_tokens_self_select"
on public.device_tokens for select to authenticated
using (user_id = auth.uid());

drop policy if exists "device_tokens_self_insert" on public.device_tokens;
create policy "device_tokens_self_insert"
on public.device_tokens for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "device_tokens_self_update" on public.device_tokens;
create policy "device_tokens_self_update"
on public.device_tokens for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_device_tokens_user on public.device_tokens(user_id);
create index if not exists idx_device_tokens_customer on public.device_tokens(customer_id);

-- Colunas fcm_token de apoio (ignora erro se a tabela não existir)
do $$ begin
  if to_regclass('public.customers') is not null then
    alter table public.customers add column if not exists fcm_token text;
  end if;
  if to_regclass('public.profiles') is not null then
    alter table public.profiles add column if not exists fcm_token text;
  end if;
end $$;
