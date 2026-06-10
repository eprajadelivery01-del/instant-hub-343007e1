const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: './instant-hub-343007e1/.env'});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_policies');
  if (error) {
    console.error('Error fetching policies, trying table schema');
  }

  const { data: cols, error: colErr } = await supabase.from('reviews').select('*').limit(1);
  console.log('Columns:', cols ? Object.keys(cols[0] || {}) : colErr);
}

checkSchema();
