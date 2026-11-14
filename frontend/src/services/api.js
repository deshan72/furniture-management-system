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

// UUID v4 generator helper
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

// Clean customer object for Supabase schema (strips non-existent DB columns, serializes extra metadata into notes)
function sanitizeCustomerPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const fullName = raw.name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim() || 'Valued Customer';
  const cleanPhone = String(raw.phone || '').trim();
  const cleanWa = String(raw.whatsapp || raw.phone || '').trim();
  const cleanNic = raw.nic ? String(raw.nic).trim().toUpperCase() : (raw.customer_id ? String(raw.customer_id).trim() : null);

  // Extract or build meta object
  const meta = {
    b: raw.branch_code ? String(raw.branch_code).trim().toUpperCase() : 'MHG',
    c: raw.center_code ? String(raw.center_code).trim().toUpperCase() : 'C001',
    city: raw.city || '',
    cs: raw.civil_status || 'Single',
    dob: raw.dob || '',
    cat: raw.category || 'custom_order',
    fn: raw.first_name || '',
    mn: raw.middle_name || '',
    ln: raw.last_name || '',
    orders: Number(raw.total_orders) || 1,
    spent: Number(raw.total_spent) || 0,
    cid: raw.customer_id || cleanNic || '',
  };

  if (raw.photo && (raw.photo.startsWith('http://') || raw.photo.startsWith('https://'))) {
    meta.photo = raw.photo;
  }

  // Strip existing meta tag if any to avoid duplication
  const userNotes = String(raw.notes || '').replace(/<!--DNS_META:[\s\S]*?-->/g, '').trim();
  const serializedNotes = `<!--DNS_META:${JSON.stringify(meta)}-->\n${userNotes}`.trim();

  // ONLY the 8 valid columns of Supabase customers table:
  const clean = {
    name: fullName,
    phone: cleanPhone || '0770000000',
    whatsapp: cleanWa || cleanPhone || '0770000000',
    address: raw.address || null,
    nic: cleanNic || null,
    outstanding_balance: Number(raw.outstanding_balance) || 0,
    notes: serializedNotes,
  };

  if (raw.id && uuidRegex.test(raw.id)) {
    clean.id = raw.id;
  }

  return clean;
}

// Deserializes Supabase customers row back into full frontend schema
export function deserializeCustomerFromDb(row) {
  if (!row || typeof row !== 'object') return row;

  let meta = {};
  let notes = row.notes || '';

  if (notes && notes.includes('<!--DNS_META:')) {
    const match = notes.match(/<!--DNS_META:([\s\S]*?)-->/);
    if (match) {
      try {
        meta = JSON.parse(match[1]);
        notes = notes.replace(match[0], '').trim();
      } catch {
        // ignore parse error
      }
    }
  }

  const cleanNic = row.nic || meta.cid || '';
  const fullName = row.name || '';
  const nameParts = fullName.split(' ');
  const firstName = meta.fn || nameParts[0] || '';
  const middleName = meta.mn || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '');
  const lastName = meta.ln || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');

  return {
    ...row,
    customer_id: meta.cid || cleanNic || row.id,
    branch_code: meta.b || 'MHG',
    center_code: meta.c || 'C001',
    contract_no: meta.orders ? String(meta.orders) : '1',
    item_code: '',
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    civil_status: meta.cs || 'Single',
    dob: meta.dob || '',
    nic: cleanNic,
    city: meta.city || (row.address ? row.address.split(',').pop().trim() : 'Maharagama'),
    category: meta.cat || 'custom_order',
    outstanding_balance: Number(row.outstanding_balance) || 0,
    total_spent: Number(meta.spent) || Number(row.outstanding_balance) || 0,
    total_orders: Number(meta.orders) || 1,
    notes: notes,
    photo: meta.photo || '',
    image_url: meta.photo || '',
  };
}

// Clean order object for Supabase schema, serializing extra frontend contract/item fields into notes
function sanitizeOrderPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const subtotal = Number(raw.gross_amount || raw.subtotal || raw.total_amount) || 0;
  const advance = Number(raw.advance_paid) || 0;
  const balance = raw.balance_due !== undefined ? Number(raw.balance_due) : Math.max(0, subtotal - advance);
  const paymentStatus = balance <= 0 ? 'paid' : advance > 0 ? 'partial' : 'unpaid';

  const meta = {
    inv: raw.invoice_no || '',
    contract: raw.contract_no || '',
    pb: raw.passbook_no || 'PN',
    date: raw.date || new Date().toISOString().slice(0, 10),
    c_id: raw.customer_id || '',
    c_name: raw.customer_name || '',
    c_nic: raw.customer_nic || '',
    c_phone: raw.customer_phone || '',
    c_addr: raw.customer_address || '',
    branch: raw.branch_code || 'MHG',
    center: raw.center_code || 'C001',
    item_id: raw.item_id || '',
    item_code: raw.item_code || '',
    item_name: raw.item_name || raw.items_summary || '',
    cat: raw.category || 'wood',
    qty: Number(raw.quantity) || 1,
    unit_price: Number(raw.unit_price) || subtotal,
    gross: subtotal,
    advance: advance,
    balance: balance,
    pay_type: raw.payment_type || 'installment',
    freq: raw.loan_frequency || 'monthly',
    terms: Number(raw.loan_terms) || 12,
    inst_val: Number(raw.installment_value) || 0,
    due_date: raw.first_due_date || '',
    inst_paid: Number(raw.installments_paid) || (advance > 0 ? 1 : 0),
    pay_method: raw.payment_method || 'Cash',
    st: raw.status || (balance <= 0 ? 'Fully Paid' : 'Active Loan'),
  };

  const userNotes = String(raw.notes || '').replace(/<!--DNS_META:[\s\S]*?-->/g, '').trim();
  const serializedNotes = `<!--DNS_META:${JSON.stringify(meta)}-->\n${userNotes}`.trim();

  const clean = {
    order_type: raw.order_type || (raw.payment_type === 'installment' ? 'custom_order' : 'ready_stock'),
    order_status: raw.order_status || (raw.status === 'Fully Paid' ? 'delivered' : 'confirmed'),
    subtotal: subtotal,
    discount: Number(raw.discount) || 0,
    delivery_charge: Number(raw.delivery_charge) || 0,
    total_amount: subtotal,
    advance_paid: advance,
    balance_due: balance,
    payment_status: paymentStatus,
    delivery_date: raw.delivery_date || raw.first_due_date || null,
    notes: serializedNotes,
  };

  if (raw.customer_uuid && uuidRegex.test(raw.customer_uuid)) {
    clean.customer_id = raw.customer_uuid;
  } else if (raw.customer_id && uuidRegex.test(raw.customer_id)) {
    clean.customer_id = raw.customer_id;
  }

  if (raw.id && uuidRegex.test(raw.id)) {
    clean.id = raw.id;
  }

  return clean;
}

// Deserializes Supabase orders row back into full frontend order schema
function deserializeOrderFromDb(row) {
  if (!row || typeof row !== 'object') return row;

  let meta = {};
  let notes = row.notes || '';

  if (notes && notes.includes('<!--DNS_META:')) {
    const match = notes.match(/<!--DNS_META:([\s\S]*?)-->/);
    if (match) {
      try {
        meta = JSON.parse(match[1]);
        notes = notes.replace(match[0], '').trim();
      } catch {}
    }
  }

  const subtotal = Number(row.subtotal || row.total_amount || meta.gross) || 0;
  const advance = Number(row.advance_paid !== undefined ? row.advance_paid : meta.advance) || 0;
  const balance = Number(row.balance_due !== undefined ? row.balance_due : meta.balance) || Math.max(0, subtotal - advance);

  return {
    id: row.id,
    order_uuid: row.id,
    invoice_no: meta.inv || `DS-INV-${String(row.id).slice(0, 4).toUpperCase()}`,
    contract_no: meta.contract || `PN/${meta.center || 'C001'}/${meta.item_code || 'ITEM'}`,
    passbook_no: meta.pb || 'PN',
    date: meta.date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    customer_id: meta.c_id || meta.c_nic || row.customer_id || '',
    customer_name: meta.c_name || (row.customers?.name) || 'Client',
    customer_nic: meta.c_nic || (row.customers?.nic) || '',
    customer_phone: meta.c_phone || (row.customers?.phone) || '-',
    customer_address: meta.c_addr || (row.customers?.address) || '',
    branch_code: meta.branch || 'MHG',
    center_code: meta.center || 'C001',
    item_id: meta.item_id || '',
    item_code: meta.item_code || 'WD-101',
    item_name: meta.item_name || 'Solid Wood Furniture',
    items_summary: meta.item_name || 'Solid Wood Furniture',
    category: meta.cat || 'wood',
    quantity: Number(meta.qty) || 1,
    unit_price: Number(meta.unit_price) || subtotal,
    gross_amount: subtotal,
    advance_paid: advance,
    balance_due: balance,
    payment_type: meta.pay_type || 'installment',
    loan_frequency: meta.freq || 'monthly',
    loan_terms: Number(meta.terms) || 12,
    installment_value: Number(meta.inst_val) || 0,
    first_due_date: meta.due_date || row.delivery_date || '',
    installments_paid: Number(meta.inst_paid) || (advance > 0 ? 1 : 0),
    payment_method: meta.pay_method || 'Cash',
    status: meta.st || (balance <= 0 ? 'Fully Paid' : 'Active Loan'),
    order_status: row.order_status || 'confirmed',
    notes: notes,
    created_at: row.created_at || new Date().toISOString(),
  };
}

// Clean payment object for Supabase schema, serializing extra frontend receipt fields into notes
function sanitizePaymentPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const amount = Number(raw.amount) || 0;

  const meta = {
    rcp: raw.receipt_no || '',
    date: raw.date || new Date().toISOString().slice(0, 10),
    order_id: raw.order_id || '',
    contract: raw.contract_no || '',
    c_id: raw.customer_id || '',
    c_name: raw.customer_name || '',
    c_nic: raw.customer_nic || '',
    c_phone: raw.customer_phone || '',
    branch: raw.branch_code || 'MHG',
    center: raw.center_code || 'C001',
    pay_type: raw.payment_type || 'Order Advance',
    prev_bal: Number(raw.previous_balance) || 0,
    new_bal: Number(raw.new_balance) || 0,
    ref: raw.reference_no || '',
    by: raw.collected_by || 'Cashier',
  };

  const userNotes = String(raw.notes || '').replace(/<!--DNS_META:[\s\S]*?-->/g, '').trim();
  const serializedNotes = `<!--DNS_META:${JSON.stringify(meta)}-->\n${userNotes}`.trim();

  const clean = {
    amount: amount,
    payment_type: raw.payment_type === 'Order Advance' ? 'advance' : (raw.new_balance <= 0 ? 'full_payment' : 'balance_payment'),
    payment_method: (raw.payment_method || 'cash').toLowerCase().replace(/\s+/g, '_'),
    notes: serializedNotes,
  };

  if (raw.order_id && uuidRegex.test(raw.order_id)) {
    clean.order_id = raw.order_id;
  }
  if (raw.customer_id && uuidRegex.test(raw.customer_id)) {
    clean.customer_id = raw.customer_id;
  }
  if (raw.id && uuidRegex.test(raw.id)) {
    clean.id = raw.id;
  }

  return clean;
}

// Deserializes Supabase payments row back into full frontend payment schema
function deserializePaymentFromDb(row) {
  if (!row || typeof row !== 'object') return row;

  let meta = {};
  let notes = row.notes || '';

  if (notes && notes.includes('<!--DNS_META:')) {
    const match = notes.match(/<!--DNS_META:([\s\S]*?)-->/);
    if (match) {
      try {
        meta = JSON.parse(match[1]);
        notes = notes.replace(match[0], '').trim();
      } catch {}
    }
  }

  return {
    id: row.id,
    payment_uuid: row.id,
    receipt_no: meta.rcp || `DS-RCP-${String(row.id).slice(0, 6).toUpperCase()}`,
    date: meta.date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    order_id: meta.order_id || row.order_id || '',
    contract_no: meta.contract || '',
    customer_id: meta.c_id || meta.c_nic || row.customer_id || '',
    customer_name: meta.c_name || (row.customers?.name) || 'Client',
    customer_nic: meta.c_nic || (row.customers?.nic) || '',
    customer_phone: meta.c_phone || (row.customers?.phone) || '-',
    branch_code: meta.branch || 'MHG',
    center_code: meta.center || 'C001',
    payment_type: meta.pay_type || (row.payment_type === 'advance' ? 'Order Advance' : 'Installment Loan'),
    amount: Number(row.amount) || 0,
    previous_balance: Number(meta.prev_bal) || 0,
    new_balance: Number(meta.new_bal) || 0,
    payment_method: meta.ref?.startsWith('BOC') ? 'Bank Transfer' : (row.payment_method ? row.payment_method.charAt(0).toUpperCase() + row.payment_method.slice(1).replace('_', ' ') : 'Cash'),
    reference_no: meta.ref || '',
    collected_by: meta.by || 'Accounts Team',
    notes: notes,
    created_at: row.created_at || new Date().toISOString(),
  };
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

  const cleanEndpoint = endpoint.split('?')[0];

  // 1. Products route handling
  if (cleanEndpoint.startsWith('/products')) {
    const parts = cleanEndpoint.split('/').filter(Boolean); // ['products', ':id']
    const id = parts[1];

    if (method === 'GET') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase query failed');
      }
      const data = await res.json();
      return { success: true, count: data.length, data };
    }

    if (method === 'POST') {
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
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
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
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

  // 2. Customers route handling
  if (cleanEndpoint.startsWith('/customers')) {
    const parts = cleanEndpoint.split('/').filter(Boolean); // ['customers', ':id']
    const id = parts[1];

    if (method === 'GET') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=*&order=created_at.desc`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase customers query failed');
      }
      const rawData = await res.json();
      const data = Array.isArray(rawData) ? rawData.map(deserializeCustomerFromDb) : rawData;
      return { success: true, count: data.length, data };
    }

    if (method === 'POST') {
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      const payload = sanitizeCustomerPayload(parsedBody);
      if (!payload.id) {
        payload.id = generateUUID();
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // If unique constraint error occurs, attempt patch by nic or id
        if (err.message && (err.message.includes('unique') || err.message.includes('duplicate'))) {
          const patchParam = payload.nic ? `nic=eq.${encodeURIComponent(payload.nic)}` : `id=eq.${payload.id}`;
          delete payload.id;
          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?${patchParam}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
          });
          if (patchRes.ok) {
            const patchData = await patchRes.json().catch(() => payload);
            const rawItem = Array.isArray(patchData) ? patchData[0] : patchData;
            return { success: true, data: deserializeCustomerFromDb(rawItem) };
          }
        }
        throw new Error(err.message || 'Direct Supabase customer insert failed');
      }

      const data = await res.json();
      const rawItem = Array.isArray(data) ? data[0] : (data || payload);
      return { success: true, data: deserializeCustomerFromDb(rawItem) };
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (!id) throw new Error('Missing customer ID for update');
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      const payload = sanitizeCustomerPayload(parsedBody);
      payload.updated_at = new Date().toISOString();
      delete payload.id;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      const queryParam = isUuid ? `id=eq.${id}` : `nic=eq.${encodeURIComponent(id)}`;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?${queryParam}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase customer update failed');
      }
      const data = await res.json();
      const rawItem = Array.isArray(data) ? data[0] : data;
      return { success: true, data: deserializeCustomerFromDb(rawItem) };
    }

    if (method === 'DELETE') {
      if (!id) throw new Error('Missing customer ID for delete');
      const urlParams = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');
      const paramNic = urlParams.get('nic');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

      let queryParam = '';
      if (isUuid) {
        queryParam = `id=eq.${id}`;
      } else if (paramNic) {
        queryParam = `nic=eq.${encodeURIComponent(paramNic)}`;
      } else {
        queryParam = `nic=eq.${encodeURIComponent(id)}`;
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?${queryParam}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Direct Supabase customer delete notice:', err.message);
      }
      return { success: true };
    }
  }

  // 3. Centers route handling
  if (cleanEndpoint.startsWith('/centers')) {
    const parts = cleanEndpoint.split('/').filter(Boolean); // ['centers', ':id']
    const id = parts[1];

    if (method === 'GET') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/centers?select=*&order=created_at.desc`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase centers query failed');
      }
      const data = await res.json();
      const decoded = (data || []).map((c) => {
        let dd = c.due_date || '';
        let cd = c.cash_collect_date || '';
        if (c.notes && c.notes.includes('<!--DNS_META:')) {
          try {
            const match = c.notes.match(/<!--DNS_META:(\{.*?\})-->/);
            if (match) {
              const meta = JSON.parse(match[1]);
              if (meta.dd && !dd) dd = meta.dd;
              if (meta.cd && !cd) cd = meta.cd;
            }
          } catch (_) {}
        }
        return {
          ...c,
          due_date: dd,
          cash_collect_date: cd,
        };
      });
      return { success: true, count: decoded.length, data: decoded };
    }

    if (method === 'POST') {
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      let baseNotes = (parsedBody.notes || '').replace(/\s*<!--DNS_META:\{.*?\}-->/g, '').trim();
      const meta = {};
      if (parsedBody.due_date) meta.dd = parsedBody.due_date;
      if (parsedBody.cash_collect_date) meta.cd = parsedBody.cash_collect_date;
      const combinedNotes = Object.keys(meta).length > 0
        ? `${baseNotes} <!--DNS_META:${JSON.stringify(meta)}-->`.trim()
        : baseNotes;

      const payload = {
        center_code: parsedBody.center_code || parsedBody.code,
        branch_code: parsedBody.branch_code || 'MHG',
        name: parsedBody.name,
        name_si: parsedBody.name_si || null,
        city: parsedBody.city || null,
        address: parsedBody.address || null,
        contact_person: parsedBody.contact_person || parsedBody.officer_name || null,
        phone: parsedBody.phone || null,
        status: parsedBody.status || 'active',
        notes: combinedNotes || null,
      };
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (parsedBody.id && uuidRegex.test(parsedBody.id)) {
        payload.id = parsedBody.id;
      } else {
        payload.id = generateUUID();
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/centers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase center insert failed');
      }
      const data = await res.json();
      return { success: true, data: Array.isArray(data) ? data[0] : (data || payload) };
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (!id) throw new Error('Missing center ID for update');
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      let baseNotes = (parsedBody.notes || '').replace(/\s*<!--DNS_META:\{.*?\}-->/g, '').trim();
      const meta = {};
      if (parsedBody.due_date) meta.dd = parsedBody.due_date;
      if (parsedBody.cash_collect_date) meta.cd = parsedBody.cash_collect_date;
      const combinedNotes = Object.keys(meta).length > 0
        ? `${baseNotes} <!--DNS_META:${JSON.stringify(meta)}-->`.trim()
        : baseNotes;

      const payload = {
        ...parsedBody,
        notes: combinedNotes || null,
        updated_at: new Date().toISOString(),
      };
      delete payload.id;
      delete payload.due_date;
      delete payload.cash_collect_date;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      const queryParam = isUuid ? `id=eq.${id}` : `center_code=eq.${encodeURIComponent(id)}`;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/centers?${queryParam}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase center update failed');
      }
      const data = await res.json();
      return { success: true, data: Array.isArray(data) ? data[0] : data };
    }

    if (method === 'DELETE') {
      if (!id) throw new Error('Missing center ID for delete');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      const queryParam = isUuid ? `id=eq.${id}` : `center_code=eq.${encodeURIComponent(id)}`;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/centers?${queryParam}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase center delete failed');
      }
      return { success: true };
    }
  }

  // 4. Orders route handling
  if (cleanEndpoint.startsWith('/orders')) {
    const parts = cleanEndpoint.split('/').filter(Boolean); // ['orders', ':id']
    const id = parts[1];

    if (method === 'GET') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase orders query failed');
      }
      const rawData = await res.json();
      const data = Array.isArray(rawData) ? rawData.map(deserializeOrderFromDb) : rawData;
      return { success: true, count: data.length, data };
    }

    if (method === 'POST') {
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      const payload = sanitizeOrderPayload(parsedBody);
      if (!payload.id) {
        payload.id = generateUUID();
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Direct Supabase order insert notice:', err.message);
        return { success: true, data: { ...parsedBody, id: payload.id } };
      }

      const data = await res.json();
      const rawItem = Array.isArray(data) ? data[0] : (data || payload);
      const deserialized = deserializeOrderFromDb(rawItem);

      // If initial advance payment > 0, also record in payments table
      if (Number(parsedBody.advance_paid) > 0) {
        try {
          const advPayment = {
            id: generateUUID(),
            order_id: payload.id,
            contract_no: parsedBody.contract_no,
            customer_id: parsedBody.customer_id,
            customer_name: parsedBody.customer_name,
            customer_nic: parsedBody.customer_nic,
            customer_phone: parsedBody.customer_phone,
            branch_code: parsedBody.branch_code,
            center_code: parsedBody.center_code,
            amount: Number(parsedBody.advance_paid),
            payment_type: 'Order Advance',
            payment_method: parsedBody.payment_method || 'Cash',
            previous_balance: Number(parsedBody.gross_amount || parsedBody.total_amount),
            new_balance: Number(parsedBody.balance_due),
            notes: `Initial advance for ${parsedBody.contract_no || 'Order'}`,
          };
          const cleanAdv = sanitizePaymentPayload(advPayment);
          await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify(cleanAdv),
          });
        } catch (payErr) {
          console.warn('Advance payment recording notice:', payErr);
        }
      }

      return { success: true, data: deserialized };
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (!id) throw new Error('Missing order ID for update');
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      const payload = sanitizeOrderPayload(parsedBody);
      payload.updated_at = new Date().toISOString();
      delete payload.id;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          const rawItem = Array.isArray(data) ? data[0] : data;
          return { success: true, data: deserializeOrderFromDb(rawItem) };
        }
      }
      return { success: true, data: parsedBody };
    }

    if (method === 'DELETE') {
      if (!id) throw new Error('Missing order ID for delete');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
          method: 'DELETE',
          headers,
        });
      }
      return { success: true };
    }
  }

  // 5. Daily Payments route handling (දිනපතා මධ්‍යස්ථාන මුදල් එකතු කිරීම්)
  if (cleanEndpoint.startsWith('/payments/daily') || cleanEndpoint.startsWith('/daily_payments')) {
    const parts = cleanEndpoint.split('/').filter(Boolean);
    const id = parts[2] || (parts[0] === 'daily_payments' ? parts[1] : null);

    if (method === 'GET') {
      let res = await fetch(`${SUPABASE_URL}/rest/v1/daily_payments?select=*&order=collection_date.desc`, { headers });
      if (!res.ok) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.desc`, { headers });
      }
      if (!res.ok) throw new Error('Query daily payments failed');
      const data = await res.json();
      return { success: true, count: data.length, data: Array.isArray(data) ? data.map(deserializePaymentFromDb) : [] };
    }

    if (method === 'POST') {
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      const payload = {
        receipt_no: parsedBody.receipt_no || `DS-RCP-${Date.now().toString().slice(-6)}`,
        collection_date: parsedBody.collection_date || parsedBody.date || new Date().toISOString().slice(0, 10),
        center_code: parsedBody.center_code || 'C001',
        branch_code: parsedBody.branch_code || 'MHG',
        contract_no: parsedBody.contract_no || '',
        order_id: parsedBody.order_id || null,
        customer_id: parsedBody.customer_id || null,
        customer_name: parsedBody.customer_name || 'Client',
        customer_nic: parsedBody.customer_nic || '',
        customer_phone: parsedBody.customer_phone || '',
        amount: Number(parsedBody.amount) || 0,
        payment_method: (parsedBody.payment_method || 'cash').toLowerCase().replace(/\s+/g, '_'),
        collected_by: parsedBody.collected_by || 'Officer',
        notes: parsedBody.notes || '',
      };
      if (parsedBody.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsedBody.id)) {
        payload.id = parsedBody.id;
      }

      let res = await fetch(`${SUPABASE_URL}/rest/v1/daily_payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Fallback to unified payments table
        const fbPayload = sanitizePaymentPayload(parsedBody);
        res = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(fbPayload),
        });
      }

      if (!res.ok) {
        console.warn('Daily payment direct DB fallback notice:', res.status);
        return { success: true, data: { ...parsedBody, id: payload.id || generateUUID() } };
      }

      const data = await res.json();
      const raw = Array.isArray(data) ? data[0] : (data || payload);
      return { success: true, data: deserializePaymentFromDb(raw) };
    }

    if (method === 'DELETE') {
      if (id) {
        await fetch(`${SUPABASE_URL}/rest/v1/daily_payments?id=eq.${id}`, { method: 'DELETE', headers });
        await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.${id}`, { method: 'DELETE', headers });
      }
      return { success: true };
    }
  }

  // 6. Monthly Payments route handling (මාසික ණය වාරික සහ අත්තිකාරම් පියවීම්)
  if (cleanEndpoint.startsWith('/payments/monthly') || cleanEndpoint.startsWith('/monthly_payments')) {
    const parts = cleanEndpoint.split('/').filter(Boolean);
    const id = parts[2] || (parts[0] === 'monthly_payments' ? parts[1] : null);

    if (method === 'GET') {
      let res = await fetch(`${SUPABASE_URL}/rest/v1/monthly_payments?select=*&order=payment_date.desc`, { headers });
      if (!res.ok) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.desc`, { headers });
      }
      if (!res.ok) throw new Error('Query monthly payments failed');
      const data = await res.json();
      return { success: true, count: data.length, data: Array.isArray(data) ? data.map(deserializePaymentFromDb) : [] };
    }

    if (method === 'POST') {
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      const paymentDate = parsedBody.payment_date || parsedBody.date || new Date().toISOString().slice(0, 10);
      const payload = {
        receipt_no: parsedBody.receipt_no || `DS-RCP-${Date.now().toString().slice(-6)}`,
        payment_date: paymentDate,
        payment_month: parsedBody.payment_month || paymentDate.slice(0, 7),
        contract_no: parsedBody.contract_no || '',
        order_id: parsedBody.order_id || null,
        customer_id: parsedBody.customer_id || null,
        customer_name: parsedBody.customer_name || 'Client',
        customer_nic: parsedBody.customer_nic || '',
        customer_phone: parsedBody.customer_phone || '',
        center_code: parsedBody.center_code || 'C001',
        installment_term: Number(parsedBody.installment_term || parsedBody.installments_paid) || 1,
        amount: Number(parsedBody.amount) || 0,
        previous_balance: Number(parsedBody.previous_balance) || 0,
        new_balance: Number(parsedBody.new_balance) || 0,
        payment_type: parsedBody.payment_type || 'Installment Loan',
        payment_method: (parsedBody.payment_method || 'cash').toLowerCase().replace(/\s+/g, '_'),
        reference_no: parsedBody.reference_no || '',
        collected_by: parsedBody.collected_by || 'Cashier',
        notes: parsedBody.notes || '',
      };
      if (parsedBody.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsedBody.id)) {
        payload.id = parsedBody.id;
      }

      let res = await fetch(`${SUPABASE_URL}/rest/v1/monthly_payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const fbPayload = sanitizePaymentPayload(parsedBody);
        res = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(fbPayload),
        });
      }

      if (!res.ok) {
        console.warn('Monthly payment direct DB fallback notice:', res.status);
        return { success: true, data: { ...parsedBody, id: payload.id || generateUUID() } };
      }

      const data = await res.json();
      const raw = Array.isArray(data) ? data[0] : (data || payload);
      return { success: true, data: deserializePaymentFromDb(raw) };
    }

    if (method === 'DELETE') {
      if (id) {
        await fetch(`${SUPABASE_URL}/rest/v1/monthly_payments?id=eq.${id}`, { method: 'DELETE', headers });
        await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.${id}`, { method: 'DELETE', headers });
      }
      return { success: true };
    }
  }

  // 7. Unified Payments route handling (Generic ledger)
  if (cleanEndpoint.startsWith('/payments')) {
    const parts = cleanEndpoint.split('/').filter(Boolean); // ['payments', ':id']
    const id = parts[1];

    if (method === 'GET') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.desc`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Direct Supabase payments query failed');
      }
      const rawData = await res.json();
      const data = Array.isArray(rawData) ? rawData.map(deserializePaymentFromDb) : rawData;
      return { success: true, count: data.length, data };
    }

    if (method === 'POST') {
      const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      const payload = sanitizePaymentPayload(parsedBody);
      if (!payload.id) {
        payload.id = generateUUID();
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Direct Supabase payment insert notice:', err.message);
        return { success: true, data: { ...parsedBody, id: payload.id } };
      }

      const data = await res.json();
      const rawItem = Array.isArray(data) ? data[0] : (data || payload);
      return { success: true, data: deserializePaymentFromDb(rawItem) };
    }

    if (method === 'DELETE') {
      if (!id) throw new Error('Missing payment ID for delete');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.${id}`, {
          method: 'DELETE',
          headers,
        });
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
