import { supabaseAdmin as supabase } from '../config/supabase.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUserPayload(raw = {}) {
  const payload = {
    user_code: raw.user_code || `usr_${Date.now().toString().slice(-6)}`,
    name: raw.name || 'Staff Member',
    username: (raw.username || raw.email?.split('@')[0] || `user_${Date.now().toString().slice(-4)}`)
      .toLowerCase()
      .trim(),
    email: raw.email || null,
    phone: raw.phone || null,
    password: raw.password || 'dns123',
    role: raw.role || 'executive',
    nic: raw.nic || null,
    dob: raw.dob || null,
    age: raw.age ? Number(raw.age) : null,
    gender: raw.gender || 'Not Specified',
    photo: raw.photo || null,
    branch_code: raw.branch_code || 'MHG',
    center_code: raw.center_code || 'C001',
    assigned_center: raw.assigned_center || raw.assignedCenter || 'all',
    status: raw.status || 'Active',
    notes: raw.notes || null,
  };

  if (raw.id && UUID_REGEX.test(raw.id)) {
    payload.id = raw.id;
  }

  return payload;
}

// @desc    Get all staff users
// @route   GET /api/users
export const getUsers = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;

    let query = supabase
      .from('staff_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,user_code.ilike.%${search}%`
      );
    }

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      count: (data || []).length,
      data: data || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single staff user
// @route   GET /api/users/:id
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const matchCol = UUID_REGEX.test(id) ? 'id' : 'user_code';

    const { data, error } = await supabase
      .from('staff_users')
      .select('*')
      .eq(matchCol, id)
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

// @desc    Create new staff user
// @route   POST /api/users
export const createUser = async (req, res, next) => {
  try {
    const payload = sanitizeUserPayload(req.body);

    const { data, error } = await supabase
      .from('staff_users')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Staff user created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update staff user
// @route   PUT /api/users/:id
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const matchCol = UUID_REGEX.test(id) ? 'id' : 'user_code';
    const updates = sanitizeUserPayload(req.body);
    delete updates.id;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('staff_users')
      .update(updates)
      .eq(matchCol, id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Staff user updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete staff user
// @route   DELETE /api/users/:id
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const matchCol = UUID_REGEX.test(id) ? 'id' : 'user_code';

    const { error } = await supabase
      .from('staff_users')
      .delete()
      .eq(matchCol, id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Staff user deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
