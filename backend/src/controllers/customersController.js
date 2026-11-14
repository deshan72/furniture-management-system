import { supabaseAdmin as supabase } from '../config/supabase.js';

// Serializes frontend customer payload to match exact Supabase customers schema
function serializeCustomerToDb(raw) {
  const fullName = raw.name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim() || 'Valued Customer';
  const cleanPhone = String(raw.phone || '').trim();
  const cleanWa = String(raw.whatsapp || raw.phone || '').trim();
  const cleanNic = raw.nic ? String(raw.nic).trim().toUpperCase() : (raw.customer_id ? String(raw.customer_id).trim() : null);

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

  const userNotes = String(raw.notes || '').replace(/<!--DNS_META:[\s\S]*?-->/g, '').trim();
  const serializedNotes = `<!--DNS_META:${JSON.stringify(meta)}-->\n${userNotes}`.trim();

  const clean = {
    name: fullName,
    phone: cleanPhone,
    whatsapp: cleanWa,
    address: raw.address || null,
    nic: cleanNic,
    outstanding_balance: Number(raw.outstanding_balance) || 0,
    notes: serializedNotes,
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (raw.id && uuidRegex.test(raw.id)) {
    clean.id = raw.id;
  }

  return clean;
}

// Deserializes Supabase customers row back into full frontend schema
function deserializeCustomerFromDb(row) {
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
        // ignore
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

// @desc    Get all customers with total purchases and outstanding balance
// @route   GET /api/customers
export const getCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,nic.ilike.%${search}%,address.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    const deserialized = (data || []).map(deserializeCustomerFromDb);

    res.json({
      success: true,
      count: deserialized.length,
      data: deserialized,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer with orders history
// @route   GET /api/customers/:id
export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*, orders(*)')
      .eq('id', id)
      .single();

    if (customerError) throw customerError;

    res.json({
      success: true,
      data: deserializeCustomerFromDb(customer),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/customers
export const createCustomer = async (req, res, next) => {
  try {
    const { phone, nic } = req.body;

    // Validation checks for phone and NIC
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      if (cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be a 10-digit number starting with 0 (e.g. 077XXXXXXX)',
        });
      }
    }

    if (nic) {
      const cleanNic = String(nic).trim().toUpperCase();
      const isOldNic = /^[0-9]{9}[vVxX]$/.test(cleanNic);
      const isNewNic = /^[0-9]{12}$/.test(cleanNic);
      if (!isOldNic && !isNewNic) {
        return res.status(400).json({
          success: false,
          message: 'Invalid NIC format. Must be 9 digits + V/X (Old) or 12 digits (New).',
        });
      }
    }

    const insertPayload = serializeCustomerToDb(req.body);

    let customerResult = null;
    const { data, error } = await supabase
      .from('customers')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      // If nic duplicate, update existing
      if (error.code === '23505' && insertPayload.nic) {
        delete insertPayload.id;
        const { data: updated, error: updateErr } = await supabase
          .from('customers')
          .update(insertPayload)
          .eq('nic', insertPayload.nic)
          .select()
          .single();
        if (updateErr) throw updateErr;
        customerResult = updated;
      } else {
        throw error;
      }
    } else {
      customerResult = data;
    }

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: deserializeCustomerFromDb(customerResult),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = serializeCustomerToDb(req.body);
    delete updates.id;

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: deserializeCustomerFromDb(data),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nic } = req.query;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from('customers').delete();
    if (isUuid) {
      query = query.eq('id', id);
    } else if (nic) {
      query = query.eq('nic', nic);
    } else {
      query = query.eq('nic', id);
    }

    const { error } = await query;
    if (error) {
      console.warn('Customer delete DB warning:', error.message);
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
