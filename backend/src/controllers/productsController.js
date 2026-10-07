import { supabaseAdmin as supabase } from '../config/supabase.js';

// @desc    Get all furniture products (with optional search, category, stock filter)
// @route   GET /api/products
export const getProducts = async (req, res, next) => {
  try {
    const { category, search, inStock } = req.query;

    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,item_code.ilike.%${search}%,wood_type.ilike.%${search}%`);
    }

    if (inStock === 'true') {
      query = query.gt('stock_quantity', 0);
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

// @desc    Get single product by ID
// @route   GET /api/products/:id
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('products')
      .select('*')
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

// @desc    Create new product
// @route   POST /api/products
export const createProduct = async (req, res, next) => {
  try {
    const {
      item_code,
      name,
      category,
      wood_type,
      dimensions,
      cost_price,
      selling_price,
      stock_quantity,
      image_url,
      description,
    } = req.body;

    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          item_code,
          name,
          category,
          wood_type,
          dimensions,
          cost_price: Number(cost_price) || 0,
          selling_price: Number(selling_price) || 0,
          stock_quantity: Number(stock_quantity) || 0,
          image_url,
          description,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
