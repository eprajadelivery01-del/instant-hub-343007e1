const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nptkxlrhrlssdsevpgqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
);

async function updateStores() {
  await supabase.from('companies').update({ is_open: false }).eq('name', 'Baronesa Café');
  console.log('Fechou Baronesa Café');
  
  const { data: stores } = await supabase.from('companies').select('id, name, business_hours').in('name', ['SAKURA TEI DIAMANTINO', 'NA CHAPA HAMBURGUERIA']);
  
  for (const store of (stores || [])) {
    if (store.business_hours) {
      try {
        const hours = typeof store.business_hours === 'string' ? JSON.parse(store.business_hours) : store.business_hours;
        if (Array.isArray(hours)) {
          const dom = hours.find(h => h.day === 'Dom');
          if (dom) {
            dom.active = true;
            dom.end = '23:59';
          }
          await supabase.from('companies').update({ is_open: true, business_hours: JSON.stringify(hours) }).eq('id', store.id);
          console.log(`Abriu ${store.name}`);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      await supabase.from('companies').update({ is_open: true }).eq('id', store.id);
      console.log(`Abriu ${store.name}`);
    }
  }
}

updateStores().then(() => console.log('Done'));
