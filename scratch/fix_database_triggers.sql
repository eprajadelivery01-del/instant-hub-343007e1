-- 1. Atualizar notify_driver_trigger para usar send-push com apikey e authorization válidos
CREATE OR REPLACE FUNCTION public.notify_driver_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('pending', 'broadcasted') OR (TG_OP = 'UPDATE' AND OLD.status IN ('pending', 'broadcasted')) THEN
    PERFORM net.http_post(
      url := 'https://nptkxlrhrlssdsevpgqe.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 2. Garantir que trigger_send_push_on_delivery também esteja 100% correta
CREATE OR REPLACE FUNCTION public.trigger_send_push_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Evitar duplo disparo se notify_driver_trigger já disparar
  RETURN NEW;
END;
$$;
