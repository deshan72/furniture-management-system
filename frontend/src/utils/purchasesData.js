// Raw Material Purchases & Inward Goods (GRN) Data Store
// DNS Home Solutions - Workshop Procurement System

export const PURCHASES_STORAGE_KEY = 'dnd_purchases_list_v1';

export const SUPPLIER_CATEGORIES = [
  { id: 'timber', label: '🪵 Raw Timber & Hardwood Logs', defaultUnit: 'cu.ft' },
  { id: 'melamine', label: '📋 Melamine Boards & Plywood', defaultUnit: 'Sheets' },
  { id: 'hardware', label: '🔩 Hardware, Hinges & Runners', defaultUnit: 'Sets' },
  { id: 'finishes', label: '🎨 Polish, Lacquer & Sealers', defaultUnit: 'Gallons' },
  { id: 'upholstery', label: '🛋️ Cushion Foam & Fabric', defaultUnit: 'Rolls' },
  { id: 'electrical', label: '⚡ Smart LED & Vanity Fittings', defaultUnit: 'Units' },
  { id: 'other', label: '📦 Workshop Consumables & Fasteners', defaultUnit: 'Packs' },
];

export const PRESET_SUPPLIERS = [
  { name: 'Moratuwa Timber Depot & Mills', phone: '077-8899112', city: 'Moratuwa', defaultCategory: 'timber' },
  { name: 'Lanka Melamine & Plywood Distributors', phone: '011-2856400', city: 'Pannipitiya', defaultCategory: 'melamine' },
  { name: 'St. Anthony\'s Hardware & Fittings', phone: '011-2321456', city: 'Colombo 12', defaultCategory: 'hardware' },
  { name: 'Jinasena & Sons Polish & Paint Mart', phone: '071-4455889', city: 'Maharagama', defaultCategory: 'finishes' },
  { name: 'Kelani Foam & Upholstery Mills', phone: '076-2233441', city: 'Kelaniya', defaultCategory: 'upholstery' },
  { name: 'Lanka Electric & Smart Lighting Hub', phone: '070-5566778', city: 'Nugegoda', defaultCategory: 'electrical' },
  { name: 'Ceylon Glass & Mirror Works (Pvt) Ltd', phone: '011-4567890', city: 'Kottawa', defaultCategory: 'other' },
];

export const INITIAL_PURCHASES = [
  {
    id: 'pur-101',
    po_number: 'PO-2026-081',
    grn_number: 'GRN-1042',
    date: '2026-11-10',
    supplier_name: 'Moratuwa Timber Depot & Mills',
    supplier_phone: '077-8899112',
    supplier_city: 'Moratuwa',
    supplier_invoice_no: 'MTD-9821',
    category: 'timber',
    item_description: 'Solid Ceylon Teak 2"x4" & 3"x5" Planed Planks for Dining Suite Frames',
    quantity: 65,
    unit: 'cu.ft',
    unit_cost: 4800,
    total_cost: 312000,
    paid_amount: 312000,
    balance_due: 0,
    payment_status: 'Paid in Full',
    payment_method: 'Bank Transfer',
    destination_workshop: 'Moratuwa Main Workshop',
    received_by: 'Master Carpenter Bandara',
    notes: 'Grade-A Ceylon Teak. Moisture tested and approved for kiln drying.',
    created_at: '2026-11-10T10:30:00Z',
  },
  {
    id: 'pur-102',
    po_number: 'PO-2026-082',
    grn_number: 'GRN-1043',
    date: '2026-11-08',
    supplier_name: 'Lanka Melamine & Plywood Distributors',
    supplier_phone: '011-2856400',
    supplier_city: 'Pannipitiya',
    supplier_invoice_no: 'LMP-4402',
    category: 'melamine',
    item_description: '8ft x 4ft 18mm Matt Frost White & Oak Texture Melamine Board Sheets',
    quantity: 30,
    unit: 'Sheets',
    unit_cost: 6500,
    total_cost: 195000,
    paid_amount: 100000,
    balance_due: 95000,
    payment_status: 'Partial Advance',
    payment_method: 'Cheque',
    destination_workshop: 'Maharagama Carpentry Hub',
    received_by: 'Production Manager Sunil',
    notes: 'For Kitchen Modular Pantry batch. Balance payable in 30 days.',
    created_at: '2026-11-08T14:15:00Z',
  },
  {
    id: 'pur-103',
    po_number: 'PO-2026-083',
    grn_number: 'GRN-1044',
    date: '2026-11-05',
    supplier_name: 'St. Anthony\'s Hardware & Fittings',
    supplier_phone: '011-2321456',
    supplier_city: 'Colombo 12',
    supplier_invoice_no: 'SAH-7123',
    category: 'hardware',
    item_description: 'Heavy Soft-Close Hydraulic Concealed Hinges (100 pairs) & 18" Ball Bearing Drawer Slides',
    quantity: 100,
    unit: 'Sets',
    unit_cost: 850,
    total_cost: 85000,
    paid_amount: 85000,
    balance_due: 0,
    payment_status: 'Paid in Full',
    payment_method: 'Cash',
    destination_workshop: 'Moratuwa Main Workshop',
    received_by: 'Assembly Head Rohan',
    notes: 'Rust-proof nickel plated fittings for bedroom wardrobe batch.',
    created_at: '2026-11-05T09:20:00Z',
  },
  {
    id: 'pur-104',
    po_number: 'PO-2026-084',
    grn_number: 'GRN-1045',
    date: '2026-11-02',
    supplier_name: 'Jinasena & Sons Polish & Paint Mart',
    supplier_phone: '071-4455889',
    supplier_city: 'Maharagama',
    supplier_invoice_no: 'JPM-1094',
    category: 'finishes',
    item_description: 'Gloss PU NC Wood Lacquer (4 Gal), Teak Oil Sealer (4 Gal) & High-Strength Thinner (4 Gal)',
    quantity: 12,
    unit: 'Gallons',
    unit_cost: 5200,
    total_cost: 62400,
    paid_amount: 62400,
    balance_due: 0,
    payment_status: 'Paid in Full',
    payment_method: 'Cash',
    destination_workshop: 'Maharagama Carpentry Hub',
    received_by: 'Polisher Kamal',
    notes: 'Premium spray finish materials for dining table and almirah batch.',
    created_at: '2026-11-02T16:00:00Z',
  },
  {
    id: 'pur-105',
    po_number: 'PO-2026-085',
    grn_number: 'GRN-1046',
    date: '2026-10-28',
    supplier_name: 'Kelani Foam & Upholstery Mills',
    supplier_phone: '076-2233441',
    supplier_city: 'Kelaniya',
    supplier_invoice_no: 'KFU-5591',
    category: 'upholstery',
    item_description: 'High-Density 4-inch Orthopedic Sofa Foam Blocks & Beige Water-Repellent Linen Fabric',
    quantity: 15,
    unit: 'Sheets',
    unit_cost: 8400,
    total_cost: 126000,
    paid_amount: 50000,
    balance_due: 76000,
    payment_status: 'Credit Due',
    payment_method: 'Credit',
    destination_workshop: 'Moratuwa Main Workshop',
    received_by: 'Upholsterer Nimal',
    notes: 'Used for Veranda Armchairs and 6-seater dining chair cushions. Rs. 76,000 credit due on 25th Nov.',
    created_at: '2026-10-28T11:40:00Z',
  },
  {
    id: 'pur-106',
    po_number: 'PO-2026-086',
    grn_number: 'GRN-1047',
    date: '2026-10-24',
    supplier_name: 'Lanka Electric & Smart Lighting Hub',
    supplier_phone: '070-5566778',
    supplier_city: 'Nugegoda',
    supplier_invoice_no: 'LEH-3021',
    category: 'electrical',
    item_description: 'Touch-Sensor 3-Tone LED Strip Lighting Kits & Anti-Fog Mirror Heating Pads',
    quantity: 20,
    unit: 'Units',
    unit_cost: 2750,
    total_cost: 55000,
    paid_amount: 55000,
    balance_due: 0,
    payment_status: 'Paid in Full',
    payment_method: 'Bank Transfer',
    destination_workshop: 'Maharagama Carpentry Hub',
    received_by: 'Technician Samantha',
    notes: 'Smart LED mirror components for ELC-001 line.',
    created_at: '2026-10-24T15:10:00Z',
  },
];

export const loadSavedPurchases = () => {
  try {
    const saved = localStorage.getItem(PURCHASES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error loading purchases from localStorage:', e);
  }
  return INITIAL_PURCHASES;
};

export const savePurchasesToStorage = (purchasesList) => {
  try {
    localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(purchasesList));
  } catch (e) {
    console.warn('Failed saving purchases to localStorage:', e);
  }
};

export const generateNextPONumber = (purchases = []) => {
  const currentYear = new Date().getFullYear();
  let maxSeq = 86;
  purchases.forEach((p) => {
    if (p.po_number) {
      const match = p.po_number.match(/PO-\d{4}-(\d+)/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  });
  return `PO-${currentYear}-${String(maxSeq + 1).padStart(3, '0')}`;
};

export const generateNextGRNNumber = (purchases = []) => {
  let maxSeq = 1047;
  purchases.forEach((p) => {
    if (p.grn_number) {
      const match = p.grn_number.match(/GRN-(\d+)/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  });
  return `GRN-${maxSeq + 1}`;
};

