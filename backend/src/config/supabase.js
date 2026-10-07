import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Ensure clean base URL without trailing slash or /rest/v1
const sanitizeUrl = (url) => {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

const supabaseUrl = sanitizeUrl(process.env.SUPABASE_URL);
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Warning: SUPABASE_URL or SUPABASE_ANON_KEY is missing in backend/.env.'
  );
} else {
  console.log(`✅ Supabase initialized for project: ${supabaseUrl}`);
}

// Client for general queries
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Client for server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

export default supabase;
