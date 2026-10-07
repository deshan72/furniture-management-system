import { supabase } from '../config/supabase.js';

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
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,nic.ilike.%${search}%`);
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
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/customers
export const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, whatsapp, address, nic, notes } = req.body;

    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          name,
          phone,
          whatsapp: whatsapp || phone,
          address,
          nic,
          notes,
          outstanding_balance: 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data,
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
    const updates = req.body;

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
      data,
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

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
