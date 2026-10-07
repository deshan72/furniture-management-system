import { supabase } from './src/config/supabase.js';

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    // Attempt to query products table
    const { data, error } = await supabase.from('products').select('*').limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log('⚠️ Connected to Supabase successfully, but the tables (products, customers, etc.) do NOT exist yet.');
        console.log('👉 Please execute database/schema.sql in the Supabase SQL Editor.');
      } else {
        console.log('❌ Supabase returned an error:', error.message, error);
      }
      return;
    }

    console.log('🎉 Supabase connection successful! Table "products" exists.');
    console.log('Data:', data);
  } catch (err) {
    console.error('❌ Connection exception:', err.message);
  }
}

testConnection();
