import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
  console.log("=================================================");
  console.log("  AUDITORIA COMPLETA DO BANCO DE DADOS (SUPABASE)");
  console.log("=================================================");

  // 1. Audit Customers fcm_token
  const { data: custWithToken, count: custCount, error: errCust } = await supabase
    .from('customers')
    .select('id, user_id, name, phone, fcm_token, updated_at', { count: 'exact' })
    .not('fcm_token', 'is', null);

  console.log("\n[1] TABELA `customers` COM fcm_token PREENCHIDO:");
  console.log("    Total de clientes com fcm_token:", custWithToken ? custWithToken.length : 0);
  if (custWithToken && custWithToken.length > 0) {
    console.log("    Registros encontrados:", JSON.stringify(custWithToken, null, 2));
  } else if (errCust) {
    console.log("    Erro:", errCust.message);
  }

  // 2. Audit Companies fcm_token
  const { data: compWithToken, error: errComp } = await supabase
    .from('companies')
    .select('id, name, fcm_token, updated_at')
    .not('fcm_token', 'is', null);

  console.log("\n[2] TABELA `companies` COM fcm_token PREENCHIDO (APP DO LOJISTA):");
  console.log("    Total de lojas com fcm_token:", compWithToken ? compWithToken.length : 0);
  if (compWithToken && compWithToken.length > 0) {
    console.log("    Amostra das 5 primeiras lojas:", JSON.stringify(compWithToken.slice(0, 5), null, 2));
  } else if (errComp) {
    console.log("    Erro:", errComp.message);
  }

  // 3. Audit Specific Test Customer
  const { data: testCust, error: errTestCust } = await supabase
    .from('customers')
    .select('id, user_id, name, phone, fcm_token, updated_at')
    .or('id.eq.1df9b294-475e-4f0a-9e44-0bd212c8f64e,user_id.eq.366f1e01-fd0b-49fc-b3dc-2f42ae6f1fc2');

  console.log("\n[3] CLIENTE DE TESTE (novotesteapple / ID: 1df9b294-475e-4f0a-9e44-0bd212c8f64e):");
  console.log(JSON.stringify(testCust, null, 2));

  // 4. Audit Recent Orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, status, customer_id, user_id, company_id, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log("\n[4] ÚLTIMOS 5 PEDIDOS REALIZADOS NO SISTEMA:");
  console.log(JSON.stringify(recentOrders, null, 2));
}

runAudit();
