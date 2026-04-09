
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('order_items').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Columns:', data.length > 0 ? Object.keys(data[0]) : 'No rows found to inspect');
  }
}

check();
