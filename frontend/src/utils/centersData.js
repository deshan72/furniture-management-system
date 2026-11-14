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
    name_si: '',
    city: 'Maharagama',
    address: 'No. 120, High Level Road, Maharagama',
    contact_person: 'Sarath Gunawardena',
    phone: '0772345671',
    status: 'active',
    due_date: '2026-11-10',
    cash_collect_date: '2026-11-14',
    notes: 'Main distribution and client service center for Colombo South.',
    created_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'cntr-2',
    center_code: 'C002',
    branch_code: 'MHG',
    name: 'Kottawa Town Center',
    name_si: '',
    city: 'Kottawa',
    address: '45, Kottawa Road, Kottawa',
    contact_person: 'Nuwan Perera',
    phone: '0715566778',
    status: 'active',
    due_date: '2026-11-12',
    cash_collect_date: '2026-11-15',
    notes: 'Sub-center covering Kottawa, Homagama and Pannipitiya areas.',
    created_at: '2026-08-25T11:30:00Z',
  },
  {
    id: 'cntr-3',
    center_code: 'C001',
    branch_code: 'MRT',
    name: 'Moratuwa Woodcraft Center',
    name_si: '',
    city: 'Moratuwa',
    address: '88, Galle Road, Rawathawatta, Moratuwa',
    contact_person: 'Nalaka Fernando',
    phone: '0768899001',
    status: 'active',
    due_date: '2026-11-08',
    cash_collect_date: '2026-11-14',
    notes: 'Primary workshop hub and timber showroom center.',
    created_at: '2026-07-15T08:45:00Z',
  },
  {
    id: 'cntr-4',
    center_code: 'C001',
    branch_code: 'NGB',
    name: 'Negombo Coastal Center',
    name_si: '',
    city: 'Negombo',
    address: '24/B, Lewis Place, Negombo',
    contact_person: 'Rohan Silva',
    phone: '0704455667',
    status: 'active',
    due_date: '2026-11-05',
    cash_collect_date: '2026-11-16',
    notes: 'Hotel & commercial resort projects liaison center.',
    created_at: '2026-09-01T10:15:00Z',
  },
  {
    id: 'cntr-5',
    center_code: 'C001',
    branch_code: 'DHW',
    name: 'Dehiwala Urban Center',
    name_si: '',
    city: 'Dehiwala',
    address: '104, Hill Street, Dehiwala',
    contact_person: 'Dinesh Kumara',
    phone: '0785566778',
    status: 'active',
    due_date: '2026-11-11',
    cash_collect_date: '2026-11-14',
    notes: 'Covers retail showroom stock and office furniture inquiries.',
    created_at: '2026-09-18T14:20:00Z',
  },
  {
    id: 'cntr-6',
    center_code: 'C003',
    branch_code: 'CMB',
    name: 'Colombo Central Center',
    name_si: '',
    city: 'Colombo',
    address: '56/1, Havelock Road, Colombo 05',
    contact_person: 'Chaminda Wickrama',
    phone: '0751122334',
    status: 'active',
    due_date: '2026-11-09',
    cash_collect_date: '2026-11-14',
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
        return parsed.map((c, idx) => {
          let dd = c.due_date || '';
          let cd = c.cash_collect_date || '';
          if (c.notes && c.notes.includes('<!--DNS_META:')) {
            try {
              const match = c.notes.match(/<!--DNS_META:(\{.*?\})-->/);
              if (match) {
                const meta = JSON.parse(match[1]);
                if (meta.dd && !dd) dd = meta.dd;
                if (meta.cd && !cd) cd = meta.cd;
                if (meta.due_date && !dd) dd = meta.due_date;
                if (meta.cash_collect_date && !cd) cd = meta.cash_collect_date;
              }
            } catch (_) {}
          }
          // Default fallback for initial centers if missing
          const defaultSeed = INITIAL_CENTERS.find(
            (ic) => ic.id === c.id || ic.center_code === c.center_code || ic.name === c.name
          );
          if (!cd && defaultSeed?.cash_collect_date) cd = defaultSeed.cash_collect_date;
          if (!dd && defaultSeed?.due_date) dd = defaultSeed.due_date;

          return {
            ...c,
            center_code: formatCenterCode(c.center_code || `C00${idx + 1}`),
            due_date: dd,
            cash_collect_date: cd,
          };
        });
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_CENTERS;
};

