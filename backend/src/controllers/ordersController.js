import { supabaseAdmin as supabase } from '../config/supabase.js';

// @desc    Get all orders with customer details
// @route   GET /api/orders
export const getOrders = async (req, res, next) => {
  try {
    const { status, payment_status } = req.query;

    let query = supabase
      .from('orders')
      .select('*, customers(name, phone), order_items(*, products(name, item_code))')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('order_status', status);
    }

    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data,
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
    const {
      customer_id,
      order_type, // 'ready_stock' | 'custom_order'
      items, // array of { product_id, quantity, unit_price, custom_notes }
      discount = 0,
      delivery_charge = 0,
      advance_paid = 0,
      payment_method = 'cash',
      delivery_date,
      notes,
    } = req.body;

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const total_amount = subtotal - Number(discount) + Number(delivery_charge);
    const balance_due = total_amount - Number(advance_paid);
    const payment_status = balance_due <= 0 ? 'paid' : advance_paid > 0 ? 'partial' : 'unpaid';

    // 1. Create Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          customer_id,
          order_type: order_type || 'ready_stock',
          subtotal,
          discount: Number(discount),
          delivery_charge: Number(delivery_charge),
          total_amount,
          advance_paid: Number(advance_paid),
          balance_due,
          payment_status,
          order_status: 'confirmed',
          delivery_date,
          notes,
        },
      ])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert Order Items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        custom_notes: item.custom_notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Update product inventory quantities if ready_stock
      for (const it of items) {
        if (it.product_id) {
          await supabase.rpc('decrement_product_stock', {
            prod_id: it.product_id,
            qty: it.quantity,
          }).catch(() => {});
        }
      }
    }

    // 4. Record advance payment in cashbook/payments if paid > 0
    if (Number(advance_paid) > 0) {
      await supabase.from('payments').insert([
        {
          order_id: order.id,
          customer_id,
          amount: Number(advance_paid),
          payment_type: 'advance',
          payment_method: payment_method || 'cash',
          notes: `Advance for Order #${order.id.slice(0, 8)}`,
        },
      ]);

      // Record in cashbook transactions
      await supabase.from('cash_transactions').insert([
        {
          transaction_type: 'cash_in',
          category: 'order_advance',
          amount: Number(advance_paid),
          payment_method: payment_method || 'cash',
          reference_id: order.id,
          description: `Advance payment for Order #${order.id.slice(0, 8)}`,
        },
      ]);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
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
