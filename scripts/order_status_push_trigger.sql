-- Dispara a Edge Function send-push sempre que o status de um pedido/entrega muda.
-- Requer as extensões pg_net e as configurações abaixo.
create extension if not exists pg_net;

-- Guarde a URL do projeto e a service role key (rode uma vez, como superuser/owner):
-- alter database postgres set app.settings.supabase_url = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
-- alter database postgres set app.settings.service_role_key = 'SUA_SERVICE_ROLE_KEY';

create or replace function public.notify_order_status_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
  v_order_id uuid;
  v_status text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  v_status := new.status;
  v_order_id := case when tg_table_name = 'deliveries' then new.order_id else new.id end;

  v_title := case v_status
    when 'confirmed'  then '✅ Pedido confirmado!'
    when 'preparing'  then '👨‍🍳 Preparando seu pedido'
    when 'ready'      then '📦 Pedido pronto!'
    when 'collecting' then '🛵 Entregador a caminho da loja'
    when 'accepted'   then '🛵 Entregador aceitou a entrega'
    when 'delivering' then '🛵 Saiu para entrega!'
    when 'in_route'   then '🛵 Saiu para entrega!'
    when 'in_transit' then '🛵 Saiu para entrega!'
    when 'delivered'  then '🎉 Pedido entregue!'
    when 'cancelled'  then '❌ Pedido cancelado'
    else null
  end;

  if v_title is null then
    return new;
  end if;

  v_body := 'Acompanhe seu pedido no app É Pra Já.';

  perform net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'orderId', v_order_id::text,
      'status', v_status,
      'title', v_title,
      'body', v_body,
      'url', '/marketplace/orders/' || v_order_id::text
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_orders_status_push on public.orders;
create trigger trg_orders_status_push
after insert or update of status on public.orders
for each row execute function public.notify_order_status_push();

drop trigger if exists trg_deliveries_status_push on public.deliveries;
create trigger trg_deliveries_status_push
after insert or update of status on public.deliveries
for each row execute function public.notify_order_status_push();
