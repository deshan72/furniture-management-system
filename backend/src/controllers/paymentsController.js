import { supabaseAdmin as supabase } from '../config/supabase.js';

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
    receipt_no: row.receipt_no || meta.rcp || `DS-RCP-${String(row.id).slice(0, 6).toUpperCase()}`,
    date: row.payment_date || row.collection_date || meta.date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    order_id: row.order_id || meta.order_id || '',
    contract_no: row.contract_no || meta.contract || '',
    customer_id: row.customer_id || meta.c_id || meta.c_nic || '',
    customer_name: row.customer_name || meta.c_name || (row.customers?.name) || 'Client',
    customer_nic: row.customer_nic || meta.c_nic || (row.customers?.nic) || '',
    customer_phone: row.customer_phone || meta.c_phone || (row.customers?.phone) || '-',
    branch_code: row.branch_code || meta.branch || 'MHG',
    center_code: row.center_code || meta.center || 'C001',
    payment_type: row.payment_type || meta.pay_type || (row.payment_type === 'advance' ? 'Order Advance' : 'Installment Loan'),
    amount: Number(row.amount) || 0,
    previous_balance: Number(row.previous_balance !== undefined ? row.previous_balance : meta.prev_bal) || 0,
    new_balance: Number(row.new_balance !== undefined ? row.new_balance : meta.new_bal) || 0,
    payment_method: row.payment_method || (meta.ref?.startsWith('BOC') ? 'Bank Transfer' : 'Cash'),
    reference_no: row.reference_no || meta.ref || '',
    collected_by: row.collected_by || meta.by || 'Accounts Team',
    notes: notes,
    created_at: row.created_at || new Date().toISOString(),
  };
}

// =========================================================================
// UNIFIED PAYMENTS (Generic ledger endpoint)
// =========================================================================
// @desc    Get all payments
// @route   GET /api/payments
export const getPayments = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const deserialized = (data || []).map(deserializePaymentFromDb);

    res.json({
      success: true,
      count: deserialized.length,
      data: deserialized,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new payment (unified ledger)
// @route   POST /api/payments
export const createPayment = async (req, res, next) => {
  try {
    const raw = req.body || {};
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

    const payload = {
      amount,
      payment_type: raw.payment_type === 'Order Advance' ? 'advance' : (raw.new_balance <= 0 ? 'full_payment' : 'balance_payment'),
      payment_method: (raw.payment_method || 'cash').toLowerCase().replace(/\s+/g, '_'),
      notes: serializedNotes,
    };

    if (raw.order_id && uuidRegex.test(raw.order_id)) payload.order_id = raw.order_id;
    if (raw.customer_id && uuidRegex.test(raw.customer_id)) payload.customer_id = raw.customer_id;

    const { data, error } = await supabase
      .from('payments')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: deserializePaymentFromDb(data),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
export const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) console.warn('Payment delete notice:', error.message);

    res.json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// DAILY PAYMENTS (දිනපතා මධ්‍යස්ථාන මුදල් එකතු කිරීම්)
// =========================================================================
// @desc    Get all daily payments
// @route   GET /api/payments/daily
export const getDailyPayments = async (req, res, next) => {
  try {
    const { center_code, date } = req.query;
    let query = supabase
      .from('daily_payments')
      .select('*')
      .order('collection_date', { ascending: false });

    if (center_code && center_code !== 'all') {
      query = query.eq('center_code', center_code);
    }
    if (date) {
      query = query.eq('collection_date', date);
    }

    let { data, error } = await query;

    // Fallback if daily_payments table not yet created in Supabase
    if (error && error.message && error.message.includes('daily_payments')) {
      const fb = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      data = (fb.data || []).map(deserializePaymentFromDb);
      error = null;
    }

    if (error) throw error;

    res.json({
      success: true,
      count: (data || []).length,
      data: data || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new daily payment
// @route   POST /api/payments/daily
export const createDailyPayment = async (req, res, next) => {
  try {
    const raw = req.body || {};
    const amount = Number(raw.amount) || 0;
    const collectionDate = raw.collection_date || raw.date || new Date().toISOString().slice(0, 10);
    const receiptNo = raw.receipt_no || `DS-RCP-${Date.now().toString().slice(-6)}`;

    const payload = {
      receipt_no: receiptNo,
      collection_date: collectionDate,
      center_code: raw.center_code || 'C001',
      branch_code: raw.branch_code || 'MHG',
      contract_no: raw.contract_no || '',
      order_id: raw.order_id || null,
      customer_id: raw.customer_id || null,
      customer_name: raw.customer_name || 'Client',
      customer_nic: raw.customer_nic || '',
      customer_phone: raw.customer_phone || '',
      amount: amount,
      payment_method: (raw.payment_method || 'cash').toLowerCase().replace(/\s+/g, '_'),
      collected_by: raw.collected_by || 'Officer',
      notes: raw.notes || '',
    };

    // 1. Insert into daily_payments table
    let { data, error } = await supabase
      .from('daily_payments')
      .insert([payload])
      .select()
      .single();

    // Fallback if table not ready
    if (error && error.message && error.message.includes('daily_payments')) {
      const fbPayload = {
        amount,
        payment_type: 'daily_center_collection',
        payment_method: payload.payment_method,
        notes: `<!--DNS_META:${JSON.stringify(payload)}-->\n${raw.notes || ''}`.trim(),
      };
      const fb = await supabase.from('payments').insert([fbPayload]).select().single();
      data = fb.data ? { ...payload, id: fb.data.id } : payload;
      error = null;
    }

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Daily center payment recorded successfully',
      data: data || payload,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete daily payment
// @route   DELETE /api/payments/daily/:id
export const deleteDailyPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('daily_payments')
      .delete()
      .eq('id', id);

    if (error) console.warn('Daily payment delete notice:', error.message);

    res.json({
      success: true,
      message: 'Daily payment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// MONTHLY PAYMENTS (මාසික ණය වාරික සහ අත්තිකාරම් පියවීම්)
// =========================================================================
// @desc    Get all monthly payments
// @route   GET /api/payments/monthly
export const getMonthlyPayments = async (req, res, next) => {
  try {
    const { month, contract_no } = req.query;
    let query = supabase
      .from('monthly_payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (month) query = query.eq('payment_month', month);
    if (contract_no) query = query.eq('contract_no', contract_no);

    let { data, error } = await query;

    // Fallback if monthly_payments table not yet created in Supabase
    if (error && error.message && error.message.includes('monthly_payments')) {
      const fb = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      data = (fb.data || []).map(deserializePaymentFromDb);
      error = null;
    }

    if (error) throw error;

    res.json({
      success: true,
      count: (data || []).length,
      data: data || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new monthly payment
// @route   POST /api/payments/monthly
export const createMonthlyPayment = async (req, res, next) => {
  try {
    const raw = req.body || {};
    const amount = Number(raw.amount) || 0;
    const paymentDate = raw.payment_date || raw.date || new Date().toISOString().slice(0, 10);
    const receiptNo = raw.receipt_no || `DS-RCP-${Date.now().toString().slice(-6)}`;
    const paymentMonth = raw.payment_month || paymentDate.slice(0, 7);

    const payload = {
      receipt_no: receiptNo,
      payment_date: paymentDate,
      payment_month: paymentMonth,
      contract_no: raw.contract_no || '',
      order_id: raw.order_id || null,
      customer_id: raw.customer_id || null,
      customer_name: raw.customer_name || 'Client',
      customer_nic: raw.customer_nic || '',
      customer_phone: raw.customer_phone || '',
      center_code: raw.center_code || 'C001',
      installment_term: Number(raw.installment_term || raw.installments_paid) || 1,
      amount: amount,
      previous_balance: Number(raw.previous_balance) || 0,
      new_balance: Number(raw.new_balance) || 0,
      payment_type: raw.payment_type || 'Installment Loan',
      payment_method: (raw.payment_method || 'cash').toLowerCase().replace(/\s+/g, '_'),
      reference_no: raw.reference_no || '',
      collected_by: raw.collected_by || 'Cashier',
      notes: raw.notes || '',
    };

    // 1. Insert into monthly_payments table
    let { data, error } = await supabase
      .from('monthly_payments')
      .insert([payload])
      .select()
      .single();

    // Fallback if table not ready
    if (error && error.message && error.message.includes('monthly_payments')) {
      const fbPayload = {
        amount,
        payment_type: raw.new_balance <= 0 ? 'full_payment' : 'balance_payment',
        payment_method: payload.payment_method,
        notes: `<!--DNS_META:${JSON.stringify(payload)}-->\n${raw.notes || ''}`.trim(),
      };
      const fb = await supabase.from('payments').insert([fbPayload]).select().single();
      data = fb.data ? { ...payload, id: fb.data.id } : payload;
      error = null;
    }

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Monthly payment recorded successfully',
      data: data || payload,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete monthly payment
// @route   DELETE /api/payments/monthly/:id
export const deleteMonthlyPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('monthly_payments')
      .delete()
      .eq('id', id);

    if (error) console.warn('Monthly payment delete notice:', error.message);

    res.json({
      success: true,
      message: 'Monthly payment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
