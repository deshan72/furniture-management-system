import { supabaseAdmin } from './src/config/supabase.js';

async function verifyAllTables() {
  const tables = ['products', 'customers', 'orders', 'order_items', 'payments', 'cash_transactions'];
  console.log('Verifying all database tables in Supabase...');

  for (const table of tables) {
    const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table "${table}": Error - ${error.message}`);
    } else {
      console.log(`✅ Table "${table}": Active & Ready`);
    }
  }
}

verifyAllTables();
