CREATE OR REPLACE FUNCTION public.trigger_send_push_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_name TEXT := 'Loja Parceira';
  v_pickup_addr TEXT := 'Retirada na Loja';
  v_dropoff_addr TEXT := 'Endereço do Cliente';
  v_delivery_fee NUMERIC := 0;
  v_order RECORD;
  v_company RECORD;
  v_details TEXT;
  v_payload JSONB;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT NULL AND OLD.status = 'pending' THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id LIMIT 1;
    IF FOUND THEN
      IF v_order.company_name IS NOT NULL AND v_order.company_name <> '' THEN
        v_company_name := v_order.company_name;
      ELSIF v_order.store_name IS NOT NULL AND v_order.store_name <> '' THEN
        v_company_name := v_order.store_name;
      END IF;

      IF v_order.delivery_address IS NOT NULL AND v_order.delivery_address <> '' THEN
        v_dropoff_addr := v_order.delivery_address;
      ELSIF v_order.customer_address IS NOT NULL AND v_order.customer_address <> '' THEN
        v_dropoff_addr := v_order.customer_address;
      ELSIF v_order.street IS NOT NULL AND v_order.street <> '' THEN
        v_dropoff_addr := v_order.street || ', ' || COALESCE(v_order.number, 'S/N') || COALESCE(' - ' || v_order.neighborhood, '');
      END IF;

      v_delivery_fee := COALESCE(v_order.delivery_fee, v_order.shipping_fee, v_order.driver_fee, 0);
      
      IF NEW.company_id IS NULL AND v_order.company_id IS NOT NULL THEN
        NEW.company_id := v_order.company_id;
      END IF;
    END IF;
  END IF;

  IF NEW.company_id IS NOT NULL THEN
    SELECT name, trade_name, address INTO v_company FROM public.companies WHERE id = NEW.company_id LIMIT 1;
    IF FOUND THEN
      IF v_company.trade_name IS NOT NULL AND v_company.trade_name <> '' THEN
        v_company_name := v_company.trade_name;
      ELSIF v_company.name IS NOT NULL AND v_company.name <> '' THEN
        v_company_name := v_company.name;
      END IF;

      IF v_company.address IS NOT NULL AND v_company.address <> '' THEN
        v_pickup_addr := v_company.address;
      END IF;
    END IF;
  END IF;

  IF NEW.pickup_address IS NOT NULL AND NEW.pickup_address <> '' THEN v_pickup_addr := NEW.pickup_address; END IF;
  IF NEW.delivery_address IS NOT NULL AND NEW.delivery_address <> '' THEN v_dropoff_addr := NEW.delivery_address; END IF;
  IF COALESCE(NEW.delivery_fee, 0) > 0 THEN v_delivery_fee := NEW.delivery_fee; END IF;
  IF COALESCE(NEW.value, 0) > 0 THEN v_delivery_fee := NEW.value; END IF;

  v_details := '🏬 Loja: ' || v_company_name || chr(10) ||
               '📍 Coleta: ' || v_pickup_addr || chr(10) ||
               '🏁 Entrega: ' || v_dropoff_addr || chr(10) ||
               '💰 Ganhos: R$ ' || REPLACE(TO_CHAR(v_delivery_fee, 'FM9990.00'), '.', ',');

  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', jsonb_build_object(
      'id', NEW.id,
      'status', NEW.status,
      'company_id', NEW.company_id,
      'order_id', NEW.order_id,
      'store_name', v_company_name,
      'company_name', v_company_name,
      'pickup_address', v_pickup_addr,
      'delivery_address', v_dropoff_addr,
      'delivery_fee', v_delivery_fee,
      'details', v_details,
      'address', v_details
    )
  );

  PERFORM net.http_post(
      url := 'https://nptkxlrhrlssdsevpgqe.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Host', 'nptkxlrhrlssdsevpgqe.supabase.co',
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
      ),
      body := v_payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push notification webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
