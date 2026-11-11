// Product Item Code & Category Sequence Utilities
// Prefix Rules:
// - Wood: WD-xxx (e.g. WD-001, WD-002)
// - Melamine: MEL-xxx (e.g. MEL-001, MEL-002)
// - Electrical Items: ELC-xxx (e.g. ELC-001, ELC-002)

export const CATEGORY_CODE_PREFIXES = {
  wood: 'WD-',
  melamine: 'MEL-',
  electrical_item: 'ELC-',
};

export const getCategoryPrefix = (category) => {
  if (!category) return 'WD-';
  const cat = String(category).toLowerCase().trim();
  if (cat === 'wood' || cat.includes('wood') || cat === 'living_room' || cat === 'bedroom' || cat === 'dining') {
    return 'WD-';
  }
  if (cat === 'melamine' || cat.includes('melamine') || cat === 'office') {
    return 'MEL-';
  }
  if (cat === 'electrical_item' || cat === 'electrical' || cat.includes('electric')) {
    return 'ELC-';
  }
  return 'WD-';
};

export const generateNextItemCode = (category, currentProducts = []) => {
  const prefix = getCategoryPrefix(category);
  const numbers = (Array.isArray(currentProducts) ? currentProducts : [])
    .filter((p) => p && p.item_code && String(p.item_code).toUpperCase().startsWith(prefix))
    .map((p) => {
      const match = String(p.item_code).toUpperCase().match(new RegExp(`^${prefix}(\\d+)`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n) && n > 0);

  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    item_code: 'WD-001',
    name: 'Royal Teak 6-Seater Dining Table',
    category: 'wood',
    wood_type: 'Teak',
    finish: 'Natural Matte Lacquer',
    dimensions: '72"L x 38"W x 30"H',
    cost_price: 65000,
    selling_price: 98500,
    stock_quantity: 4,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=600&q=80',
    description: 'Solid Ceylon Teak wood top with heavy carved legs and 6 matching cushioned chairs.',
    created_at: '2026-09-15T10:00:00Z',
  },
  {
    id: 'prod-2',
    item_code: 'WD-002',
    name: 'Mahogany 3-Door Wardrobe (Almirah)',
    category: 'wood',
    wood_type: 'Mahogany',
    finish: 'Warm Mahogany Gloss',
    dimensions: '78"H x 54"W x 22"D',
    cost_price: 52000,
    selling_price: 78000,
    stock_quantity: 1,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=600&q=80',
    description: 'Fitted with inner locker, solid brass hinges, full-length mirror, and polished drawers.',
    created_at: '2026-09-20T14:30:00Z',
  },
  {
    id: 'prod-3',
    item_code: 'MEL-001',
    name: 'Modern Melamine Modular Kitchen Pantry Unit',
    category: 'melamine',
    wood_type: 'Melamine Board',
    finish: 'Matt Frost White & Oak Texture',
    dimensions: '96"W x 24"D x 84"H',
    cost_price: 85000,
    selling_price: 135000,
    stock_quantity: 3,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
    description: 'Water-resistant premium melamine board body with hydraulic soft-close hinges.',
    created_at: '2026-09-25T11:15:00Z',
  },
  {
    id: 'prod-4',
    item_code: 'MEL-002',
    name: 'Executive Melamine Office Desk (L-Shape)',
    category: 'melamine',
    wood_type: 'Melamine Board',
    finish: 'Melamine Scratch-Resistant Walnut',
    dimensions: '60"W x 30"D x 30"H + 36" Side Return',
    cost_price: 45000,
    selling_price: 68500,
    stock_quantity: 2,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80',
    description: 'Modern executive desk with 3 lockable drawers, cable management ports, and keyboard tray.',
    created_at: '2026-10-01T09:00:00Z',
  },
  {
    id: 'prod-5',
    item_code: 'ELC-001',
    name: 'Smart LED Mirror Vanity & Concealed Wiring',
    category: 'electrical_item',
    wood_type: 'Electrical & Metal Fittings',
    finish: 'Touch-Sensor 3-Tone LED',
    dimensions: '36"W x 28"H x 5"D',
    cost_price: 18000,
    selling_price: 28500,
    stock_quantity: 5,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1622372738946-62e02505feb3?auto=format&fit=crop&w=600&q=80',
    description: 'Smart vanity mirror with 3-tone touch LED light, anti-fog heating pad, and power socket.',
    created_at: '2026-10-05T16:20:00Z',
  },
  {
    id: 'prod-6',
    item_code: 'WD-003',
    name: 'Teak Veranda Easy Lounge Armchair',
    category: 'wood',
    wood_type: 'Teak',
    finish: 'Outdoor Weatherproof Teak Oil',
    dimensions: '32"W x 34"D x 36"H',
    cost_price: 14000,
    selling_price: 22500,
    stock_quantity: 2,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1580481077111-94e82e2cbaef?auto=format&fit=crop&w=600&q=80',
    description: 'Traditional Sri Lankan plantation style relaxing veranda chair with handwoven rattan back.',
    created_at: '2026-10-08T13:10:00Z',
  },
];

export const loadSavedProducts = () => {
  try {
    const saved = localStorage.getItem('dnd_products_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading products from localStorage:', e);
  }
  return INITIAL_PRODUCTS;
};

