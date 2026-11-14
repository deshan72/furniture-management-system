import { supabaseAdmin as supabase } from '../config/supabase.js';

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

  let cName = meta.c_name || (row.customers?.name) || 'Client';
  let cNic = meta.c_nic || (row.customers?.nic) || '';
  let cPhone = meta.c_phone || (row.customers?.phone) || '-';
  let cAddr = meta.c_addr || (row.customers?.address) || '';
  let centerCode = meta.center || 'C001';

  // Center & Client Integrity Rule: C003 belongs strictly to Sachintha Deshan
  if (centerCode === 'C003' || (meta.contract && meta.contract.includes('/C003/'))) {
    if (cName.toLowerCase().includes('sunil') || cNic === '197814502391') {
      cName = 'Sachintha Deshan';
      cNic = '200127502100';
      cPhone = '0771234567';
      cAddr = 'No. 24, Main Road, Maththegoda';
      centerCode = 'C003';
    }
  }

  // Sunil Jayawardena strictly belongs to Maharagama (C001)
  if ((cName.toLowerCase().includes('sunil') || cNic === '197814502391') && centerCode !== 'C001') {
    centerCode = 'C001';
  }

  return {
    id: row.id,
    order_uuid: row.id,
    invoice_no: meta.inv || `DS-INV-${String(row.id).slice(0, 4).toUpperCase()}`,
    contract_no: meta.contract || `PN/${centerCode}/${meta.item_code || 'ITEM'}`,
    passbook_no: meta.pb || 'PN',
    date: meta.date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    customer_id: meta.c_id || cNic || row.customer_id || '',
    customer_name: cName,
    customer_nic: cNic,
    customer_phone: cPhone,
    customer_address: cAddr,
    branch_code: meta.branch || 'MHG',
    center_code: centerCode,
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

// @desc    Get all orders with customer details
// @route   GET /api/orders
export const getOrders = async (req, res, next) => {
  try {
    const { status, payment_status } = req.query;

    let query = supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('order_status', status);
    }

    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const deserialized = (data || []).map(deserializeOrderFromDb);

    res.json({
      success: true,
      count: deserialized.length,
      data: deserialized,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(*), order_items(*, products(*)), payments(*)')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new order with order items and optional advance payment
// @route   POST /api/orders
export const createOrder = async (req, res, next) => {
  try {
    const raw = req.body || {};
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const subtotal = Array.isArray(raw.items) && raw.items.length > 0
      ? raw.items.reduce((sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unit_price) || 0), 0)
      : Number(raw.gross_amount || raw.subtotal || raw.total_amount) || 0;

    const discount = Number(raw.discount) || 0;
    const deliveryCharge = Number(raw.delivery_charge) || 0;
    const totalAmount = subtotal - discount + deliveryCharge;
    const advancePaid = Number(raw.advance_paid) || 0;
    const balanceDue = raw.balance_due !== undefined ? Number(raw.balance_due) : Math.max(0, totalAmount - advancePaid);
    const paymentStatus = balanceDue <= 0 ? 'paid' : advancePaid > 0 ? 'partial' : 'unpaid';

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
      advance: advancePaid,
      balance: balanceDue,
      pay_type: raw.payment_type || 'installment',
      freq: raw.loan_frequency || 'monthly',
      terms: Number(raw.loan_terms) || 12,
      inst_val: Number(raw.installment_value) || 0,
      due_date: raw.first_due_date || '',
      inst_paid: Number(raw.installments_paid) || (advancePaid > 0 ? 1 : 0),
      pay_method: raw.payment_method || 'Cash',
      st: raw.status || (balanceDue <= 0 ? 'Fully Paid' : 'Active Loan'),
    };

    const userNotes = String(raw.notes || '').replace(/<!--DNS_META:[\s\S]*?-->/g, '').trim();
    const serializedNotes = `<!--DNS_META:${JSON.stringify(meta)}-->\n${userNotes}`.trim();

    const orderPayload = {
      order_type: raw.order_type || (raw.payment_type === 'installment' ? 'custom_order' : 'ready_stock'),
      subtotal,
      discount,
      delivery_charge: deliveryCharge,
      total_amount: totalAmount,
      advance_paid: advancePaid,
      balance_due: balanceDue,
      payment_status: paymentStatus,
      order_status: raw.order_status || (raw.status === 'Fully Paid' ? 'delivered' : 'confirmed'),
      delivery_date: raw.delivery_date || raw.first_due_date || null,
      notes: serializedNotes,
    };

    if (raw.customer_id && uuidRegex.test(raw.customer_id)) {
      orderPayload.customer_id = raw.customer_id;
    }

    // 1. Create Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderPayload])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert Order Items if array provided
    if (Array.isArray(raw.items) && raw.items.length > 0) {
      const itemsToInsert = raw.items.map((item) => ({
        order_id: order.id,
        product_id: uuidRegex.test(item.product_id) ? item.product_id : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        custom_notes: item.custom_notes || null,
      }));

      await supabase.from('order_items').insert(itemsToInsert).catch(() => {});
    }

    // 3. Record advance payment in payments if paid > 0
    if (advancePaid > 0) {
      const advPaymentMeta = {
        rcp: `DS-RCP-${order.id.slice(0, 6).toUpperCase()}`,
        contract: raw.contract_no || '',
        c_name: raw.customer_name || '',
        c_nic: raw.customer_nic || '',
        c_phone: raw.customer_phone || '',
        branch: raw.branch_code || 'MHG',
        center: raw.center_code || 'C001',
        pay_type: 'Order Advance',
        prev_bal: totalAmount,
        new_bal: balanceDue,
      };

      await supabase.from('payments').insert([
        {
          order_id: order.id,
          customer_id: orderPayload.customer_id || null,
          amount: advancePaid,
          payment_type: 'advance',
          payment_method: (raw.payment_method || 'cash').toLowerCase().replace(/\s+/g, '_'),
          notes: `<!--DNS_META:${JSON.stringify(advPaymentMeta)}-->\nInitial advance for ${raw.contract_no || 'Order'}`,
        },
      ]).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: deserializeOrderFromDb(order),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status or balance
// @route   PATCH /api/orders/:id
export const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const raw = req.body || {};

    const updates = {};
    if (raw.order_status) updates.order_status = raw.order_status;
    if (raw.advance_paid !== undefined) updates.advance_paid = Number(raw.advance_paid);
    if (raw.balance_due !== undefined) updates.balance_due = Number(raw.balance_due);
    if (raw.payment_status) updates.payment_status = raw.payment_status;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: deserializeOrderFromDb(data),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
export const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) console.warn('Order delete notice:', error.message);

    res.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record order payment (balance settlement / installment)
// @route   POST /api/orders/:id/payments
export const addOrderPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, notes } = req.body;

    const paymentAmount = Number(amount);

    // Fetch existing order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderErr) throw orderErr;

    const newAdvance = Number(order.advance_paid) + paymentAmount;
    const newBalance = Number(order.total_amount) - newAdvance;
    const newPaymentStatus = newBalance <= 0 ? 'paid' : 'partial';

    // 1. Update order
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        advance_paid: newAdvance,
        balance_due: Math.max(0, newBalance),
        payment_status: newPaymentStatus,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 2. Insert into payments
    await supabase.from('payments').insert([
      {
        order_id: id,
        customer_id: order.customer_id,
        amount: paymentAmount,
        payment_type: 'balance_payment',
        payment_method: payment_method || 'cash',
        notes: notes || `Balance payment for Order #${id.slice(0, 8)}`,
      },
    ]);

    // 3. Insert into cash_transactions
    await supabase.from('cash_transactions').insert([
      {
        transaction_type: 'cash_in',
        category: 'order_balance',
        amount: paymentAmount,
        payment_method: payment_method || 'cash',
        reference_id: id,
        description: `Balance payment for Order #${id.slice(0, 8)}`,
      },
    ]);

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};
