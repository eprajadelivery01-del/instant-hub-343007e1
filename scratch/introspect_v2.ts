
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

async function check() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const spec = await res.json();
  
  const tables = ['orders', 'order_items', 'deliveries', 'companies'];
  tables.forEach(t => {
    console.log(`\n--- TABLE: ${t} ---`);
    const props = spec.definitions?.[t]?.properties;
    if (props) {
       console.log(Object.keys(props).join(', '));
    } else {
       console.log('Not found in definitions');
    }
  });
}

check();
