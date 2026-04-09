
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- CHECKING COMPANIES SCHEMA ---');
  const { data, error } = await supabase.from('companies').select('*').limit(1);
  if (error) {
    console.error('Select error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    console.log('No rows in companies table.');
  }

  console.log('\n--- CHECKING REGIONS SCHEMA ---');
  const { data: rData } = await supabase.from('regions').select('*').limit(1);
  if (rData && rData.length > 0) {
    console.log('Regions Columns:', Object.keys(rData[0]));
  }
}

check();
