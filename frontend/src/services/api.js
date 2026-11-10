const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const STORAGE_BUCKET = 'project product image';

// Convert base64 Data URL to Blob for browser fetch upload
export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

// Upload image (File, Blob, or base64 data URL) directly to Supabase Storage bucket 'project product image'
export async function uploadImageToSupabaseStorage(imageInput, itemCode = 'prod') {
  if (!imageInput) return '';

  // Already a public hosted URL (http / https)
  if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
    return imageInput;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase URL or Key is not configured for Storage upload.');
    return imageInput;
  }

  try {
    let blob;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    if (imageInput instanceof Blob || imageInput instanceof File) {
      blob = imageInput;
      mimeType = imageInput.type || 'image/jpeg';
      ext = mimeType.split('/')[1] || 'jpg';
      if (ext === 'jpeg') ext = 'jpg';
    } else if (typeof imageInput === 'string' && imageInput.startsWith('data:image/')) {
      blob = dataUrlToBlob(imageInput);
      mimeType = blob.type || 'image/jpeg';
      ext = mimeType.split('/')[1] || 'jpg';
      if (ext === 'jpeg') ext = 'jpg';
    } else {
      return imageInput;
    }

    const cleanCode = (itemCode || 'prod').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const fileName = `${cleanCode}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const encodedBucket = encodeURIComponent(STORAGE_BUCKET);
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${encodedBucket}/${fileName}`;

    console.log(`📤 Uploading image to Supabase Storage bucket "${STORAGE_BUCKET}" (${fileName})...`);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: blob,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Supabase Storage upload failed with status ${res.status}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodedBucket}/${fileName}`;
    console.log(`✅ Supabase Storage upload complete: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error('Failed to upload image to Supabase Storage:', err);
    throw err;
  }
}

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
      if (parsedBody.image_url && parsedBody.image_url.startsWith('data:image/')) {
        try {
          parsedBody.image_url = await uploadImageToSupabaseStorage(parsedBody.image_url, parsedBody.item_code);
        } catch (uploadErr) {
          console.warn('Storage upload fallback warning in directSupabaseRequest:', uploadErr);
        }
      }
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
      if (parsedBody.image_url && parsedBody.image_url.startsWith('data:image/')) {
        try {
          parsedBody.image_url = await uploadImageToSupabaseStorage(parsedBody.image_url, parsedBody.item_code);
        } catch (uploadErr) {
          console.warn('Storage upload fallback warning in directSupabaseRequest:', uploadErr);
        }
      }
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
