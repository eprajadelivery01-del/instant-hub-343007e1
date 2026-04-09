
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- TABLES INSPECTION ---');
  
  const tables = ['orders', 'order_items', 'deliveries', 'companies', 'addresses'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`[${table}] ERROR:`, error.message);
    } else {
      console.log(`[${table}] Columns:`, data.length > 0 ? Object.keys(data[0]) : 'No data to inspect');
    }
  }

  // Fallback: try to insert a single null record to trigger schema check error
  console.log('\n--- ATTEMPTING DIAGNOSTIC INSERT (ORDERS) ---');
  const { error: oError } = await supabase.from('orders').insert({}).select();
  console.log('Orders insert error:', oError?.message);

  console.log('\n--- ATTEMPTING DIAGNOSTIC INSERT (DELIVERIES) ---');
  const { error: dError } = await supabase.from('deliveries').insert({}).select();
  console.log('Deliveries insert error:', dError?.message);
}

check();
