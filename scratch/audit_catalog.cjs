const { createClient } = require('@supabase/supabase-js');
const url = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';
const supabase = createClient(url, anonKey);

async function run() {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, is_open, category, products(id, name, active, price)')
    .eq('show_in_marketplace', true);

  if (error) {
    console.error(error);
    return;
  }

  console.log('Total empresas marketplace:', companies.length);
  for (const c of companies) {
    const rawProds = c.products || [];
    const validProds = rawProds.filter(p => p.active !== false);
    const hasCatalog = validProds.length > 0;
    console.log(`- [${c.is_open ? 'ABERTA' : 'FECHADA'}] ${c.name} | Prods: ${validProds.length} | Catálogo: ${hasCatalog ? 'DISPONÍVEL' : 'EM ATUALIZAÇÃO'}`);
  }
}

run();
