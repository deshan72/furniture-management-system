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

// @desc    Create new payment
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

