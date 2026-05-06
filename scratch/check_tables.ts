
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  const { data, error } = await supabase.from('chat_sessions').select('*').limit(1);
  if (error) {
    console.log('Error accessing chat_sessions:', error.message);
  } else {
    console.log('chat_sessions exists');
  }

  const { data: msgData, error: msgError } = await supabase.from('chat_message_logs').select('*').limit(1);
  if (msgError) {
    console.log('Error accessing chat_message_logs:', msgError.message);
  } else {
    console.log('chat_message_logs exists');
  }
}

checkTables();
