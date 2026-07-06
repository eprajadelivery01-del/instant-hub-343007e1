
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseAnãonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';

const supabase = createClient(supabaseUrl, supabaseAnãonKey);

async function fixSchema() {
  console.log('Attempting to fix conversations table schema...');
  // Note: Since we don't have migrations, we rely on the fact that if a column is missing, the first inserát might fail or we can try to detect it.
  // However, I'll just assume I can't run ALTER TABLE via anãon key.
  // I will check if I can at least see the columns.
  
  const { data, error } = await supabase.from('conversations').select('*').limit(1);
  if (error) {
    console.error('Error selecting from conversations:', error.message);
  } else if (data) {
    const columns = Object.keys(data[0] || {});
    console.log('Available columns in conversations:', columns);
    if (!columns.includes('topic')) console.warn('Column "topic" is MISSING!');
    if (!columns.includes('title')) console.warn('Column "title" is MISSING!');
  }
}

fixSchema();
