import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'davinynsilva@gmail.com',
    password: 'password123'
  });

  if (auth.error) {
    console.error('Login error:', auth.error);
    return;
  }

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      companies (name),
      customers (name, phone)
    `)
    .order("created_at", { ascending: false });

  console.log('Error:', error);
  console.log('Data count:', data?.length);
}
run();
