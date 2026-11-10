import { supabaseAdmin as supabase } from '../config/supabase.js';
import { formatCenterCode } from './centersController.js';

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
        `name.ilike.%${search}%,phone.ilike.%${search}%,nic.ilike.%${search}%,customer_id.ilike.%${search}%,city.ilike.%${search}%`
      );
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
    const {
      customer_id,
      branch_code,
      center_code,
      contract_no,
      item_code,
      first_name,
      last_name,
      name,
      civil_status,
      dob,
      phone,
      whatsapp,
      nic,
      city,
      address,
      category,
      outstanding_balance,
      total_spent,
      total_orders,
      notes,
    } = req.body;

    const fullName = name || `${first_name || ''} ${last_name || ''}`.trim() || 'Valued Customer';

    const insertPayload = {
      name: fullName,
      phone,
      whatsapp: whatsapp || phone,
      address: address || null,
      nic: nic || null,
      notes: notes || null,
      outstanding_balance: Number(outstanding_balance) || 0,
      total_spent: Number(total_spent) || 0,
      total_orders: Number(total_orders) || 1,
    };

    if (customer_id) insertPayload.customer_id = customer_id;
    if (branch_code) insertPayload.branch_code = String(branch_code).trim().toUpperCase();
    if (center_code) insertPayload.center_code = formatCenterCode(center_code);
    if (contract_no) insertPayload.contract_no = contract_no;
    if (item_code) insertPayload.item_code = item_code;
    if (first_name) insertPayload.first_name = first_name;
    if (last_name) insertPayload.last_name = last_name;
    if (civil_status) insertPayload.civil_status = civil_status;
    if (dob) insertPayload.dob = dob;
    if (city) insertPayload.city = city;
    if (category) insertPayload.category = category;

    const { data, error } = await supabase
      .from('customers')
      .insert([insertPayload])
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
    const updates = { ...req.body };
    if (updates.center_code) updates.center_code = formatCenterCode(updates.center_code);
    if (updates.branch_code) updates.branch_code = String(updates.branch_code).trim().toUpperCase();

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
