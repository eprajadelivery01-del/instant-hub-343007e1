
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- TEST INSERT INTO ORDERS ---');
  const { error } = await supabase.from('orders').insert({
    delivery_fee: 1.23,
    status: 'pending'
  });
  
  if (error) {
    console.log('Insert Error:', error.message);
    console.log('Error Code:', error.code);
  } else {
    console.log('Insert Success! The column exists.');
  }

  console.log('\n--- TEST SELECT FROM COMPANIES ---');
  const { data, error: cError } = await supabase.from('companies').select('delivery_fee').limit(1);
  if (cError) {
    console.log('Companies column Error:', cError.message);
  } else {
    console.log('Companies column exists.');
  }
}

check();
