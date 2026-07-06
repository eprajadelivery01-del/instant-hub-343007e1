import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nptkxlrhrlssdsevpgqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
);

async function checkStores() {
  const { data, error } = await supabase
    .from('companies')
    .select('name, is_open, active, business_hours, timezone')
    .eq('show_in_marketplace', true);
    
  if (error) {
    console.error('Error fetching:', error.message);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

checkStores();
