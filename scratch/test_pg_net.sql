SELECT net.http_post(
  url := 'https://nptkxlrhrlssdsevpgqe.supabase.co/functions/v1/send-push',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
  ),
  body := '{"table":"deliveries","type":"INSERT","schema":"public","record":{"id":"8265a14e-fb58-4bf9-b514-7c373d766b73","status":"pending","store_name":"Loja Tes Tes","delivery_fee":10.0}}'::jsonb
);
