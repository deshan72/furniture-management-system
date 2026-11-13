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

// Serialize center metadata (due_date, cash_collect_date) into notes comment
export const serializeCenterToDb = (raw) => {
  let baseNotes = (raw.notes || '').replace(/\s*<!--DNS_META:\{.*?\}-->/g, '').trim();
  const meta = {};
  if (raw.due_date) meta.dd = raw.due_date;
  if (raw.cash_collect_date) meta.cd = raw.cash_collect_date;
  const combinedNotes = Object.keys(meta).length > 0
    ? `${baseNotes} <!--DNS_META:${JSON.stringify(meta)}-->`.trim()
    : baseNotes;

  return {
    center_code: formatCenterCode(raw.center_code),
    branch_code: String(raw.branch_code || 'MHG').trim().toUpperCase(),
    name: String(raw.name || '').trim(),
    name_si: raw.name_si || null,
    city: raw.city || null,
    address: raw.address || null,
    contact_person: raw.contact_person || null,
    phone: raw.phone || null,
    status: raw.status || 'active',
    notes: combinedNotes || null,
  };
};

// Deserialize center metadata from notes
export const deserializeCenterFromDb = (row) => {
  if (!row) return row;
  let dd = row.due_date || '';
  let cd = row.cash_collect_date || '';
  if (row.notes && row.notes.includes('<!--DNS_META:')) {
    try {
      const match = row.notes.match(/<!--DNS_META:(\{.*?\})-->/);
      if (match) {
        const meta = JSON.parse(match[1]);
        if (meta.dd && !dd) dd = meta.dd;
        if (meta.cd && !cd) cd = meta.cd;
      }
    } catch (_) {}
  }
  return {
    ...row,
    due_date: dd,
    cash_collect_date: cd,
  };
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

    const list = (data || []).map(deserializeCenterFromDb);

    res.json({
      success: true,
      count: list.length,
      data: list,
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
      data: deserializeCenterFromDb(center),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new regional center
// @route   POST /api/centers
export const createCenter = async (req, res, next) => {
  try {
    const insertPayload = serializeCenterToDb(req.body);

    const { data, error } = await supabase
      .from('centers')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Center created successfully',
      data: deserializeCenterFromDb(data),
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
    const updates = serializeCenterToDb(req.body);

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
      data: deserializeCenterFromDb(data),
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

