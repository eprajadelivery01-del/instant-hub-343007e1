-- ============================================================
-- Ciclo de vida dos tokens FCM: saúde, quarentena, rotação e limpeza
-- Executar DEPOIS de scripts/device_tokens.sql
-- ============================================================

alter table public.device_tokens add column if not exists last_success_at timestamptz;
alter table public.device_tokens add column if not exists last_attempt_at  timestamptz;
alter table public.device_tokens add column if not exists last_error_code  text;
alter table public.device_tokens add column if not exists last_error_message text;
alter table public.device_tokens add column if not exists failure_count    integer not null default 0;
alter table public.device_tokens add column if not exists disabled_at      timestamptz;
alter table public.device_tokens add column if not exists disabled_reason  text;
alter table public.device_tokens add column if not exists rotated_from     text;

create index if not exists idx_device_tokens_active
  on public.device_tokens(disabled_at) where disabled_at is null;
create index if not exists idx_device_tokens_last_success
  on public.device_tokens(last_success_at);

-- ------------------------------------------------------------
-- Registro do resultado de um envio (chamado pela Edge Function)
-- outcome: 'success' | 'invalid' | 'transient' | 'auth' | 'quota'
-- ------------------------------------------------------------
create or replace function public.record_push_result(
  _token text,
  _outcome text,
  _error_code text default null,
  _error_message text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _outcome = 'success' then
    update public.device_tokens
       set last_success_at = now(),
           last_attempt_at = now(),
           failure_count = 0,
           last_error_code = null,
           last_error_message = null,
           disabled_at = null,
           disabled_reason = null
     where token = _token;

  elsif _outcome = 'invalid' then
    -- UNREGISTERED / NOT_FOUND / INVALID_ARGUMENT no campo token: remoção definitiva
    delete from public.device_tokens where token = _token;

  else
    update public.device_tokens
       set last_attempt_at = now(),
           failure_count = failure_count + 1,
           last_error_code = _error_code,
           last_error_message = left(coalesce(_error_message, ''), 500),
           -- 5 falhas transitórias consecutivas => quarentena
           disabled_at = case when failure_count + 1 >= 5 then now() else disabled_at end,
           disabled_reason = case when failure_count + 1 >= 5
                                  then coalesce(_error_code, 'transient_failures')
                                  else disabled_reason end
     where token = _token;
  end if;
end $$;

revoke all on function public.record_push_result(text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_push_result(text, text, text, text) to service_role;

-- ------------------------------------------------------------
-- Limpeza / rotação periódica
--  * remove tokens inativos há mais de 270 dias (limite do FCM)
--  * remove duplicados do mesmo dispositivo/usuário mantendo o mais recente
--  * reativa tokens em quarentena depois de 24h para nova tentativa
-- ------------------------------------------------------------
create or replace function public.cleanup_device_tokens(_stale_days integer default 270)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stale int; v_dupes int; v_revived int; v_orphans int;
begin
  delete from public.device_tokens
   where coalesce(last_success_at, updated_at, created_at) < now() - make_interval(days => _stale_days);
  get diagnostics v_stale = row_count;

  with ranked as (
    select id,
           row_number() over (
             partition by coalesce(user_id::text, customer_id::text, phone), platform
             order by coalesce(last_success_at, updated_at, created_at) desc
           ) as rn
      from public.device_tokens
     where coalesce(user_id::text, customer_id::text, phone) is not null
  )
  delete from public.device_tokens d using ranked r
   where d.id = r.id and r.rn > 3;
  get diagnostics v_dupes = row_count;

  delete from public.device_tokens
   where user_id is null and customer_id is null and phone is null
     and created_at < now() - interval '30 days';
  get diagnostics v_orphans = row_count;

  update public.device_tokens
     set disabled_at = null, disabled_reason = null, failure_count = 0
   where disabled_at is not null
     and disabled_at < now() - interval '24 hours'
     and coalesce(last_error_code, '') not in ('UNREGISTERED', 'NOT_FOUND');
  get diagnostics v_revived = row_count;

  return jsonb_build_object(
    'stale_removed', v_stale,
    'duplicates_removed', v_dupes,
    'orphans_removed', v_orphans,
    'revived', v_revived,
    'ran_at', now()
  );
end $$;

revoke all on function public.cleanup_device_tokens(integer) from public, anon, authenticated;
grant execute on function public.cleanup_device_tokens(integer) to service_role;

-- ------------------------------------------------------------
-- Agenda diária (requer extensão pg_cron habilitada)
-- ------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('cleanup_device_tokens_daily')
      where exists (select 1 from cron.job where jobname = 'cleanup_device_tokens_daily');
    perform cron.schedule(
      'cleanup_device_tokens_daily',
      '17 4 * * *',
      $cron$ select public.cleanup_device_tokens(); $cron$
    );
  end if;
end $$;
