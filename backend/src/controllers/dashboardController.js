import { supabase } from '../config/supabase.js';

// @desc    Get dashboard metrics & summary
// @route   GET /api/dashboard/summary
export const getDashboardSummary = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00Z`;

    // 1. Total Products & Low Stock count
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, stock_quantity');

    if (prodErr) throw prodErr;

    const totalProducts = products ? products.length : 0;
    const lowStockCount = products ? products.filter((p) => p.stock_quantity <= 2).length : 0;

    // 2. Customers & Total Outstanding Balance
    const { data: customers, error: custErr } = await supabase
      .from('customers')
      .select('id, outstanding_balance');

    if (custErr) throw custErr;

    const totalCustomers = customers ? customers.length : 0;
    const totalOutstanding = customers
      ? customers.reduce((sum, c) => sum + (Number(c.outstanding_balance) || 0), 0)
      : 0;

    // 3. Today's Cash In and Cash Out
    const { data: todayTx, error: txErr } = await supabase
      .from('cash_transactions')
      .select('amount, transaction_type')
      .gte('created_at', startOfDay);

    if (txErr) throw txErr;

    let todayCashIn = 0;
    let todayCashOut = 0;

    if (todayTx) {
      todayTx.forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        if (tx.transaction_type === 'cash_in') todayCashIn += amt;
        if (tx.transaction_type === 'cash_out') todayCashOut += amt;
      });
    }

    // 4. Recent Orders count
    const { count: pendingOrdersCount, error: ordErr } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('order_status', ['confirmed', 'in_production']);

    if (ordErr) throw ordErr;

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockCount,
        totalCustomers,
        totalOutstanding,
        todayCashIn,
        todayCashOut,
        todayNetCash: todayCashIn - todayCashOut,
        activeOrdersCount: pendingOrdersCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
