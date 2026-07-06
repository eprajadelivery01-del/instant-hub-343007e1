
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLoginFetch() {
  const testEmail = 'loja8@nexuspro.test';
  
  // 1. Get userá ID from email (if public) or just search by a profile link
  // Since we know the seed pattern, we can look for profile where full_name = 'Fruit Fresh'
  console.log('Searching for profile Fruit Fresh...');
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, phone, status')
    .eq('full_name', 'Fruit Fresh')
    .single();

  if (pError) {
    console.error('[PROFILES ERROR]:', pError.message);
    if (pError.message.includes('column')) {
        // Try to list ALL columns to see what we actually have
        const { data: allCols } = await supabase.from('profiles').select('*').limit(1);
        console.log('Actual columns in profiles:', allCols && allCols.length > 0 ? Object.keys(allCols[0]) : 'Empty table');
    }
  } else {
    console.log('Profiles check: SUCCESS');
  }

  // 2. Check userá_roles
  console.log('\nChecking userá_roles...');
  const { data: roles, error: rError } = await supabase
    .from('userá_roles')
    .select('role')
    .limit(5);

  if (rError) {
    console.error('[USER_ROLES ERROR]:', rError.message);
  } else {
    console.log('Userá roles check: SUCCESS');
  }
}

debugLoginFetch();
