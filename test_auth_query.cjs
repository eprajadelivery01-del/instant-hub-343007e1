const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const prodKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs";
const supabase = createClient("https://nptkxlrhrlssdsevpgqe.supabase.co", prodKey);

async function test() {
  console.log("Logging in as davinynsilva@gmail.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'davinynsilva@gmail.com',
    password: 'Helô2023'
  });

  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }

  console.log("Logged in successfully. User ID:", authData.user.id);

  console.log("\nQuerying companies as authenticated...");
  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('*');

  console.log("Companies Error:", compError);
  console.log("Companies Count:", companies ? companies.length : 0);
  if (companies) {
    console.log("First few companies:", companies.slice(0, 3).map(c => c.name));
  }
}

test();
