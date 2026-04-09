
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO';

const supabase = createClient(supabaseUrl, supabaseKey);

const requiredTables = [
    'addresses', 'companies', 'customers', 'deliveries', 'delivery_drivers',
    'invitations', 'occurrences', 'order_items', 'orders', 'products',
    'profiles', 'regions', 'reviews', 'conversations', 'financial_transactions',
    'messages', 'user_roles', 'wallets'
];

async function checkInfrastructure() {
    console.log('--- SYSTEM INFRASTRUCTURE CHECK ---');
    for (const table of requiredTables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`[MISSING/ERROR] ${table}: ${error.message}`);
        } else {
            console.log(`[OK] ${table}`);
        }
    }
}

checkInfrastructure();
