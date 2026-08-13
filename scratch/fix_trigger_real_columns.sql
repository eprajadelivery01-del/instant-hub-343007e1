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

  -- 1. Buscar dados do pedido se houver order_id
  IF NEW.order_id IS NOT NULL THEN
    SELECT COALESCE(o.delivery_address, ''), COALESCE(o.delivery_fee, 0), o.company_id
    INTO v_dropoff_addr, v_delivery_fee, NEW.company_id
    FROM public.orders o
    WHERE o.id = NEW.order_id
    LIMIT 1;
  END IF;

  -- 2. Buscar nome da empresa se houver company_id
  IF NEW.company_id IS NOT NULL THEN
    SELECT COALESCE(c.name, 'Loja Parceira'), COALESCE(c.address, 'Retirada na Loja')
    INTO v_company_name, v_pickup_addr
    FROM public.companies c
    WHERE c.id = NEW.company_id
    LIMIT 1;
  END IF;

  -- 3. Sobrescrever com campos da entrega se preenchidos
  IF NEW.pickup_address IS NOT NULL AND NEW.pickup_address <> '' THEN 
    v_pickup_addr := NEW.pickup_address; 
  END IF;

  IF NEW.delivery_address IS NOT NULL AND NEW.delivery_address <> '' THEN 
    v_dropoff_addr := NEW.delivery_address; 
  ELSIF NEW.dropoff_address IS NOT NULL AND NEW.dropoff_address <> '' THEN
    v_dropoff_addr := NEW.dropoff_address;
  ELSIF NEW.address IS NOT NULL AND NEW.address <> '' THEN
    v_dropoff_addr := NEW.address;
  END IF;

  IF COALESCE(NEW.delivery_fee, 0) > 0 THEN 
    v_delivery_fee := NEW.delivery_fee; 
  ELSIF COALESCE(NEW.price, 0) > 0 THEN 
    v_delivery_fee := NEW.price; 
  ELSIF COALESCE(NEW.value, 0) > 0 THEN 
    v_delivery_fee := NEW.value; 
  END IF;

  v_details := 'Loja: ' || v_company_name || ' | Coleta: ' || v_pickup_addr || ' | Entrega: ' || v_dropoff_addr || ' | Ganhos: R$ ' || REPLACE(TO_CHAR(v_delivery_fee, 'FM9990.00'), '.', ',');

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
      'price', v_delivery_fee,
      'details', v_details,
      'address', v_details
    )
  );

  PERFORM net.http_post(
      url := 'https://nptkxlrhrlssdsevpgqe.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs',
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
