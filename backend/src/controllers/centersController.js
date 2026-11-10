import { supabaseAdmin as supabase } from '../config/supabase.js';

// Normalizes center codes into 'C001' style (C followed by 3 digits)
export const formatCenterCode = (val) => {
  const clean = String(val || '').trim().toUpperCase();
  if (!clean) return '';
  const numMatch = clean.match(/^(?:C)?(\d+)$/i);
  if (numMatch) {
    return `C${numMatch[1].padStart(3, '0')}`;
  }
  return clean.startsWith('C') ? clean : `C${clean}`;
};

// @desc    Get all regional distribution centers
// @route   GET /api/centers
export const getCenters = async (req, res, next) => {
  try {
    const { search, branch, status } = req.query;

    let query = supabase
      .from('centers')
      .select('*')
      .order('branch_code', { ascending: true })
      .order('center_code', { ascending: true });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,center_code.ilike.%${search}%,branch_code.ilike.%${search}%,city.ilike.%${search}%,contact_person.ilike.%${search}%`
      );
    }

    if (branch && branch !== 'all') {
      query = query.eq('branch_code', branch.toUpperCase());
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      count: data ? data.length : 0,
      data: data || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single center
// @route   GET /api/centers/:id
export const getCenterById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: center, error } = await supabase
      .from('centers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: center,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new regional center
// @route   POST /api/centers
export const createCenter = async (req, res, next) => {
  try {
    const {
      center_code,
      branch_code,
      name,
      name_si,
      city,
      address,
      contact_person,
      phone,
      status,
      notes,
    } = req.body;

    const insertPayload = {
      center_code: formatCenterCode(center_code),
      branch_code: String(branch_code || '').trim().toUpperCase(),
      name: String(name || '').trim(),
      name_si: name_si || null,
      city: city || null,
      address: address || null,
      contact_person: contact_person || null,
      phone: phone || null,
      status: status || 'active',
      notes: notes || null,
    };

    const { data, error } = await supabase
      .from('centers')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Center created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update center details
// @route   PUT /api/centers/:id
export const updateCenter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.center_code) {
      updates.center_code = formatCenterCode(updates.center_code);
    }
    if (updates.branch_code) {
      updates.branch_code = String(updates.branch_code).trim().toUpperCase();
    }

    const { data, error } = await supabase
      .from('centers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Center updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete center
// @route   DELETE /api/centers/:id
export const deleteCenter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('centers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Center deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

