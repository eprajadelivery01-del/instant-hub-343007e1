
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- CHECKING ORDERS TABLE SCHEMA ---');
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) {
    console.error('Select error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    console.log('No rows in orders table to check columns.');
  }

  // Check columns via RPC or introspection if possible (hard with anon key)
  // Let's try to insert a dummy order without delivery_fee and catch the error to see what happens
  console.log('\n--- ATTEMPTING DUMMY INSERT ---');
  const { error: iError } = await supabase.from('orders').insert({ status: 'pending' }).select();
  console.log('Insert attempt result:', iError?.message || 'Success');
}

check();
