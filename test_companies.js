import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: 'c:\\Users\\antho\\.gemini\\antigravity-ide\\scratch\\eprajadelivery01-del\\instant-hub-343007e1\\.env'});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('companies').select('id, name, is_active, show_in_marketplace');
  console.log('Error:', error);
  console.log('Data count:', data?.length);
}
run();
