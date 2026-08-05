-- Dispara a Edge Function send-push sempre que o status de um pedido OU de uma entrega muda.
-- Requer a extensão pg_net e as configurações abaixo.
create extension if not exists pg_net;

-- Rode UMA VEZ como owner/superuser (troque a service role key):
-- alter database postgres set app.settings.supabase_url = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
-- alter database postgres set app.settings.service_role_key = 'SUA_SERVICE_ROLE_KEY';

-- Título padronizado (espelha src/utils/orderStatusResolver.ts)
create or replace function public.push_title_for_status(p_status text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_status, ''))
    when 'confirmed'  then 'Pedido confirmado!'
    when 'accepted'   then 'Pedido aceito pela loja!'
    when 'preparing'  then 'Preparando seu pedido'
    when 'ready'      then 'Pedido pronto!'
    when 'collecting' then 'Entregador a caminho da loja'
    when 'picked_up'  then 'Pedido coletado pelo entregador'
    when 'delivering' then 'Saiu para entrega!'
    when 'in_route'   then 'Saiu para entrega!'
    when 'in_transit' then 'Saiu para entrega!'
    when 'on_the_way' then 'Saiu para entrega!'
    when 'delivered'  then 'Pedido entregue!'
    when 'completed'  then 'Pedido entregue!'
    when 'cancelled'  then 'Pedido cancelado'
    when 'canceled'   then 'Pedido cancelado'
    else null
  end;
$$;

create or replace function public.send_order_push(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := public.push_title_for_status(p_status);
  v_url text;
  v_key text := current_setting('app.settings.service_role_key', true);
  v_base text := current_setting('app.settings.supabase_url', true);
begin
  if v_title is null or p_order_id is null or v_base is null or v_key is null then
    return;
  end if;

  v_url := '/marketplace/orders/' || p_order_id::text;

  perform net.http_post(
    url := v_base || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'orderId', p_order_id::text,
      'status', p_status,
      'title', v_title,
      'body', 'Acompanhe seu pedido no app É Pra Já.',
      'route', v_url
    )
  );
end;
$$;

-- ---------- ORDERS ----------
create or replace function public.notify_order_status_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  perform public.send_order_push(new.id, new.status::text);
  return new;
end;
$$;

drop trigger if exists trg_orders_status_push on public.orders;
create trigger trg_orders_status_push
after insert or update of status on public.orders
for each row execute function public.notify_order_status_push();

-- ---------- DELIVERIES ----------
create or replace function public.notify_delivery_status_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  perform public.send_order_push(new.order_id, new.status::text);
  return new;
end;
$$;

drop trigger if exists trg_deliveries_status_push on public.deliveries;
create trigger trg_deliveries_status_push
after insert or update of status on public.deliveries
for each row execute function public.notify_delivery_status_push();
