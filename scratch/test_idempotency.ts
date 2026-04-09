
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('--- TESTING IDEMPOTENCY KEY ---');
  
  const testKey = 'test-idempotency-' + Date.now();
  
  // First insert
  console.log('Inserting first order with key:', testKey);
  const { error: error1 } = await supabase.from('orders').insert({
    company_id: '00000000-0000-0000-0000-000000000000',
    total: 10,
    status: 'pending',
    idempotency_key: testKey
  });

  if (error1 && error1.code !== '42501') { // 42501 is RLS error, which is fine for this check if column is found
     console.log('First insert error (not RLS):', error1.message);
  }

  // Second insert with same key
  console.log('Inserting second order with SAME key:', testKey);
  const { error: error2 } = await supabase.from('orders').insert({
    company_id: '00000000-0000-0000-0000-000000000000',
    total: 10,
    status: 'pending',
    idempotency_key: testKey
  });

  if (error2) {
    console.log('Second insert error code:', error2.code);
    if (error2.code === '23505') {
       console.log('SUCCESS: Unique constraint handled duplication correctly (23505).');
    } else if (error2.code === '42703') {
       console.log('FAILED: Column idempotency_key does not exist yet.');
    } else {
       console.log('Error message:', error2.message);
    }
  } else {
    console.log('FAILED: Second insert succeeded even with same key.');
  }
}

verify();
