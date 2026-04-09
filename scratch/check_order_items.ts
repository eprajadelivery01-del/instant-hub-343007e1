
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- CHECKING ORDER_ITEMS SCHEMA ---');
  // Since we can't select from empty table easily to get keys if it errors, we try a dummy insert
  const { error } = await supabase.from('order_items').insert({
    order_id: '00000000-0000-0000-0000-000000000000',
    product_id: '00000000-0000-0000-0000-000000000000',
    quantity: 1,
    price: 10,
    product_name: 'test'
  }).select();

  if (error) {
    console.log('Error Message:', error.message);
  } else {
    console.log('Insert Success! All columns exist.');
  }

  // Also check deliveries just in case
  console.log('\n--- CHECKING DELIVERIES SCHEMA ---');
  const { error: dError } = await supabase.from('deliveries').insert({
    order_id: '00000000-0000-0000-0000-000000000000',
    pickup_address: 'test',
    delivery_address: 'test',
    status: 'pending'
  });
  if (dError) console.log('Deliveries Error:', dError.message);
}

check();
