import { supabaseAdmin as supabase } from '../config/supabase.js';

const STORAGE_BUCKET = 'project product image';

// Helper to upload Base64 image data URL directly to Supabase Storage bucket
async function uploadBase64ToStorage(base64Str, prefix = 'product') {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
    return base64Str; // Return as is if already a URL or empty
  }

  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Str;

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    let ext = contentType.split('/')[1] || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
    const cleanPrefix = (prefix || 'product').replace(/[^a-zA-Z0-9_-]/g, '-');
    const fileName = `${cleanPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload error in controller:', uploadError.message);
      return base64Str;
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    console.log(`✅ Uploaded image to Supabase Storage bucket "${STORAGE_BUCKET}": ${urlData?.publicUrl}`);
    return urlData?.publicUrl || base64Str;
  } catch (err) {
    console.warn('Failed to upload image to Supabase Storage:', err.message);
    return base64Str;
  }
}

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
    let {
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

    // Automatically upload image to Supabase Storage bucket 'project product image'
    if (image_url && image_url.startsWith('data:image/')) {
      image_url = await uploadBase64ToStorage(image_url, item_code || 'furn');
    }

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
    const updates = { ...req.body };

    // Automatically upload image to Supabase Storage bucket if changed
    if (updates.image_url && updates.image_url.startsWith('data:image/')) {
      updates.image_url = await uploadBase64ToStorage(updates.image_url, updates.item_code || 'furn');
    }

    // Clean primary key from updates payload
    delete updates.id;
    delete updates.created_at;
    updates.updated_at = new Date().toISOString();

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
