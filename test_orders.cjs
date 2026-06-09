const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nptkxlrhrlssdsevpgqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
);

async function test() {
  const { data } = await supabase.from('orders').select('*, addresses(*), profiles:user_id(full_name, phone)').order('created_at', { ascending: false }).limit(1);
  console.log(JSON.stringify(data, null, 2));
}

test();
