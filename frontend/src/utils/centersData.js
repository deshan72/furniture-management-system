// Visual branch identity themes (Colors & Hub names)
export const BRANCH_THEMES = {
  MHG: { bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD', label: 'Maharagama Hub' },
  MRT: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', label: 'Moratuwa Workshop' },
  NGB: { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0', label: 'Negombo Coastal' },
  DHW: { bg: '#EDE9FE', color: '#6D28D9', border: '#DDD6FE', label: 'Dehiwala Urban' },
  CMB: { bg: '#E8F1FA', color: '#1E4D8C', border: '#C6DCF2', label: 'Colombo Central' },
  KDY: { bg: '#FCE7F3', color: '#BE185D', border: '#FBCFE8', label: 'Kandy Hill' },
  GAL: { bg: '#CCFBF1', color: '#0F766E', border: '#99F6E4', label: 'Galle Southern' },
  KRN: { bg: '#FEF9C3', color: '#A16207', border: '#FEF08A', label: 'Kurunegala Hub' },
  GMP: { bg: '#F1F5F9', color: '#334155', border: '#CBD5E1', label: 'Gampaha Hub' },
};

export const getBranchTheme = (branchCode) => {
  const code = String(branchCode || '').toUpperCase();
  return (
    BRANCH_THEMES[code] || {
      bg: '#F1F5F9',
      color: '#334155',
      border: '#CBD5E1',
      label: `${code} Branch`,
    }
  );
};

// Normalizes and formats center codes into 'C001' style (C followed by 3 digits)
export const formatCenterCode = (val) => {
  const clean = String(val || '').trim().toUpperCase();
  if (!clean) return '';
  const numMatch = clean.match(/^(?:C)?(\d+)$/i);
  if (numMatch) {
    return `C${numMatch[1].padStart(3, '0')}`;
  }
  return clean.startsWith('C') ? clean : `C${clean}`;
};

// Default seed centers
export const INITIAL_CENTERS = [
  {
    id: 'cntr-1',
    center_code: 'C001',
    branch_code: 'MHG',
    name: 'Maharagama Main Center',
    name_si: 'මහරගම ප්‍රධාන මධ්‍යස්ථානය',
    city: 'Maharagama',
    address: 'No. 120, High Level Road, Maharagama',
    contact_person: 'Sarath Gunawardena',
    phone: '0772345671',
    status: 'active',
    notes: 'Main distribution and client service center for Colombo South.',
    created_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'cntr-2',
    center_code: 'C002',
    branch_code: 'MHG',
    name: 'Kottawa Town Center',
    name_si: 'කොට්ටාව නගර මධ්‍යස්ථානය',
    city: 'Kottawa',
    address: '45, Kottawa Road, Kottawa',
    contact_person: 'Nuwan Perera',
    phone: '0715566778',
    status: 'active',
    notes: 'Sub-center covering Kottawa, Homagama and Pannipitiya areas.',
    created_at: '2026-08-25T11:30:00Z',
  },
  {
    id: 'cntr-3',
    center_code: 'C001',
    branch_code: 'MRT',
    name: 'Moratuwa Woodcraft Center',
    name_si: 'මොරටුව දැව කර්මාන්ත මධ්‍යස්ථානය',
    city: 'Moratuwa',
    address: '88, Galle Road, Rawathawatta, Moratuwa',
    contact_person: 'Nalaka Fernando',
    phone: '0768899001',
    status: 'active',
    notes: 'Primary workshop hub and timber showroom center.',
    created_at: '2026-07-15T08:45:00Z',
  },
  {
    id: 'cntr-4',
    center_code: 'C001',
    branch_code: 'NGB',
    name: 'Negombo Coastal Center',
    name_si: 'මීගමුව මධ්‍යස්ථානය',
    city: 'Negombo',
    address: '24/B, Lewis Place, Negombo',
    contact_person: 'Rohan Silva',
    phone: '0704455667',
    status: 'active',
    notes: 'Hotel & commercial resort projects liaison center.',
    created_at: '2026-09-01T10:15:00Z',
  },
  {
    id: 'cntr-5',
    center_code: 'C001',
    branch_code: 'DHW',
    name: 'Dehiwala Urban Center',
    name_si: 'දෙහිවල නාගරික මධ්‍යස්ථානය',
    city: 'Dehiwala',
    address: '104, Hill Street, Dehiwala',
    contact_person: 'Dinesh Kumara',
    phone: '0785566778',
    status: 'active',
    notes: 'Covers retail showroom stock and office furniture inquiries.',
    created_at: '2026-09-18T14:20:00Z',
  },
  {
    id: 'cntr-6',
    center_code: 'C003',
    branch_code: 'CMB',
    name: 'Colombo Central Center',
    name_si: 'කොළඹ මධ්‍යම මධ්‍යස්ථානය',
    city: 'Colombo',
    address: '56/1, Havelock Road, Colombo 05',
    contact_person: 'Chaminda Wickrama',
    phone: '0751122334',
    status: 'active',
    notes: 'High-end custom interior designs & residential projects.',
    created_at: '2026-10-05T13:00:00Z',
  },
];

// Helper to safely load centers list from localStorage with fallback
export const loadSavedCenters = () => {
  try {
    const saved = localStorage.getItem('dnd_centers_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c) => ({
          ...c,
          center_code: formatCenterCode(c.center_code || 'C001'),
        }));
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_CENTERS;
};

