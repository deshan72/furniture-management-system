const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean product object for Supabase schema (strips columns that do not exist in DB)
function sanitizeProductPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const clean = {};
  if (raw.item_code !== undefined) clean.item_code = raw.item_code;
  if (raw.name !== undefined) clean.name = raw.name;
  if (raw.category !== undefined) clean.category = raw.category;
  if (raw.wood_type !== undefined) clean.wood_type = raw.wood_type;
  if (raw.dimensions !== undefined) clean.dimensions = raw.dimensions;
  if (raw.cost_price !== undefined) clean.cost_price = Number(raw.cost_price) || 0;
  if (raw.selling_price !== undefined) clean.selling_price = Number(raw.selling_price) || 0;
  if (raw.stock_quantity !== undefined) clean.stock_quantity = Number(raw.stock_quantity) || 0;
  if (raw.image_url !== undefined) clean.image_url = raw.image_url;

  // Combine finish into description if present
  let desc = raw.description || '';
  if (raw.finish && !desc.includes(raw.finish)) {
    desc = desc ? `[Finish: ${raw.finish}] ${desc}` : `[Finish: ${raw.finish}]`;
  }
  clean.description = desc;
  return clean;
}

// Fallback direct Supabase REST client
async function directSupabaseRequest(endpoint, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase URL or Key is not configured in frontend .env');
  }

  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...options.headers,
  };

  // Products route handling
  if (endpoint.startsWith('/products')) {
    const parts = endpoint.split('/').filter(Boolean); // ['products', ':id']
    const id = parts[1];

    if (method === 'GET') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase query failed');
      }
      const data = await res.json();
      return { success: true, data };
    }

    if (method === 'POST') {
      const parsedBody = options.body ? JSON.parse(options.body) : {};
      const payload = sanitizeProductPayload(parsedBody);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase insert failed');
      }
      const data = await res.json();
      return { success: true, data: Array.isArray(data) ? data[0] : data };
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (!id) throw new Error('Missing product ID for update');
      const parsedBody = options.body ? JSON.parse(options.body) : {};
      const payload = sanitizeProductPayload(parsedBody);
      payload.updated_at = new Date().toISOString();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase update failed');
      }
      const data = await res.json();
      return { success: true, data: Array.isArray(data) ? data[0] : data };
    }

    if (method === 'DELETE') {
      if (!id) throw new Error('Missing product ID for delete');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase delete failed');
      }
      return { success: true };
    }
  }

  throw new Error(`Direct fallback not implemented for ${endpoint}`);
}

// Master API request function with automatic direct Supabase fallback
export async function apiRequest(endpoint, options = {}) {
  // 1. Try Express backend API first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 sec timeout

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend API unreachable or timed out, will proceed to direct Supabase
  }

  // 2. Seamlessly fallback to direct Supabase Database connection
  try {
    const supabaseResult = await directSupabaseRequest(endpoint, options);
    return supabaseResult;
  } catch (supabaseError) {
    console.error(`Database request failed for ${endpoint}:`, supabaseError.message);
    throw supabaseError;
  }
}
