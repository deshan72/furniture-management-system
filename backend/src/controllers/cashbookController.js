import { supabaseAdmin as supabase } from '../config/supabase.js';

// @desc    Get cash transactions (filter by date, type, category)
// @route   GET /api/cashbook/transactions
export const getCashTransactions = async (req, res, next) => {
  try {
    const { date, startDate, endDate, type, category } = req.query;

    let query = supabase
      .from('cash_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (date) {
      // Filter for specific date (YYYY-MM-DD)
      query = query
        .gte('created_at', `${date}T00:00:00Z`)
        .lte('created_at', `${date}T23:59:59Z`);
    } else if (startDate && endDate) {
      query = query
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`);
    }

    if (type) {
      query = query.eq('transaction_type', type);
    }

    if (category) {
      query = query.eq('category', category);
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

// @desc    Add a manual cash transaction (Expense or Income)
// @route   POST /api/cashbook/transactions
export const addCashTransaction = async (req, res, next) => {
  try {
    const {
      transaction_type, // 'cash_in' | 'cash_out'
      category, // 'timber_raw_material', 'carpenter_wages', 'transport', 'tea_petty_cash', 'utilities', 'other_income', etc.
      amount,
      payment_method = 'cash',
      recipient_or_source,
      description,
      receipt_image_url,
    } = req.body;

    const { data, error } = await supabase
      .from('cash_transactions')
      .insert([
        {
          transaction_type,
          category,
          amount: Number(amount),
          payment_method,
          recipient_or_source,
          description,
          receipt_image_url,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get day summary for cash balancing (Opening, In, Out, Expected Closing)
// @route   GET /api/cashbook/day-summary
export const getDaySummary = async (req, res, next) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    const startOfDay = `${targetDate}T00:00:00Z`;
    const endOfDay = `${targetDate}T23:59:59Z`;

    // 1. Fetch today's transactions
    const { data: transactions, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (error) throw error;

    let totalCashIn = 0;
    let totalCashOut = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.transaction_type === 'cash_in') {
        totalCashIn += amt;
      } else if (tx.transaction_type === 'cash_out') {
        totalCashOut += amt;
      }
    });

    const netCashFlow = totalCashIn - totalCashOut;

    res.json({
      success: true,
      date: targetDate,
      summary: {
        totalCashIn,
        totalCashOut,
        netCashFlow,
        transactionCount: transactions.length,
      },
      transactions,
    });
  } catch (error) {
    next(error);
  }
};
