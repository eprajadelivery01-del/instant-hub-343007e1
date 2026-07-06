const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nptkxlrhrlssdsevpgqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
);

async function check() {
  const { data } = await supabase.from('companies').select('name, is_open, business_hours').in('name', ['SAKURA TEI DIAMANTINO', 'NA CHAPA HAMBURGUERIA', 'Baronesa Café']);
  console.log(JSON.stringify(data, null, 2));
}

check();
