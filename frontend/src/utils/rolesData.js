// System Modules and Page-Level Permissions for D&S Furniture System

export const SYSTEM_MODULES = [
  // Main
  { id: 'dashboard', label: 'Executive Dashboard', category: 'Main', description: 'Central business health, KPI metrics, distribution center stats' },

  // Orders & Billing
  { id: 'orders', label: 'Orders & Invoices', category: 'Orders & Billing', description: 'Showroom sales, custom carpentry orders, printable tax bills' },
  { id: 'payments', label: 'Payments & Advances', category: 'Orders & Billing', description: 'Customer advance deposits, installment tracking, receipts' },
  { id: 'returns', label: 'Returns & Repairs', category: 'Orders & Billing', description: 'Defective furniture returns, warranty repairs, replacements' },

  // Inventory
  { id: 'products', label: 'Products Catalog', category: 'Inventory', description: 'Wood, Melamine & Electrical furniture models, dimensions, pricing' },
  { id: 'categories', label: 'Categories', category: 'Inventory', description: 'Dining, Bedroom, Living Room, Kitchen & Office classifications' },
  { id: 'stock', label: 'Stock Management', category: 'Inventory', description: 'Physical warehouse stock quantities, warehouse transfers' },
  { id: 'low-stock', label: 'Low Stock Alerts', category: 'Inventory', description: 'Automated warnings when finished furniture falls below reorder limits' },

  // Customers
  { id: 'customers', label: 'Customer Directory', category: 'Customers', description: 'Client contact directory, delivery addresses, customer IDs' },
  { id: 'outstanding', label: 'Outstanding Balances', category: 'Customers', description: 'Client credit ledgers, debt recovery, overdue installment reminders' },

  // Centers
  { id: 'centers', label: 'Center Directory', category: 'Centers', description: 'Regional distribution hubs (MHG, MRT, NGB, DHW, CMB)' },
  { id: 'create-center', label: 'Create Regional Center', category: 'Centers', description: 'Register new regional showroom centers and center codes (C001)' },

  // Finance & Cash
  { id: 'cashbook', label: 'Daily Cash Book', category: 'Finance & Cash', description: 'Day-to-day cash in hand, carpentry wages, petty cash entries' },
  { id: 'expenses', label: 'Expenses Tracker', category: 'Finance & Cash', description: 'Timber purchases, hardware, lacquer, transport, workshop bills' },
  { id: 'day-close', label: 'Day-End Closing', category: 'Finance & Cash', description: 'Showroom cash drawer balancing, drawer closing, cash surplus/deficit' },

  // Purchasing
  { id: 'purchases', label: 'Stock Purchases', category: 'Purchasing', description: 'Raw timber logs, teak boards, melamine sheets & hardware supplier orders' },

  // Reports
  { id: 'reports-sales', label: 'Sales Reports', category: 'Reports', description: 'Sales turnover by furniture line, branch performance, date ranges' },
  { id: 'reports-profit', label: 'Profit & Margins', category: 'Reports', description: 'Gross profit margins, carpentry labor costing vs selling price' },

  // Administration
  { id: 'settings', label: 'Store Settings', category: 'Administration', description: 'Showroom branding, invoice prefixes, warranty terms, bank accounts' },
  { id: 'users', label: 'Users & Roles', category: 'Administration', description: 'Staff credentials, role permissions matrix, access control' },
  { id: 'backup', label: 'Backup / Export', category: 'Administration', description: 'Full system JSON backup downloads, CSV table exports, system restore' },
];

// Default Permission Presets by Role
export const DEFAULT_ROLE_PERMISSIONS = {
  // Super Admin / Owner: All 21 modules allowed
  admin: SYSTEM_MODULES.map((m) => m.id),

  // Sales / Showroom Executive: Customer & sales operations
  sales_executive: [
    'dashboard',
    'orders',
    'payments',
    'returns',
    'products',
    'low-stock',
    'customers',
    'outstanding',
    'centers',
    'reports-sales',
  ],

  // Cashier & Finance Executive: Invoicing, receipts, and cash management
  cashier: [
    'dashboard',
    'orders',
    'payments',
    'customers',
    'outstanding',
    'cashbook',
    'expenses',
    'day-close',
  ],

  // Workshop & Carpentry Supervisor: Inventory and stock production
  workshop_supervisor: [
    'dashboard',
    'products',
    'categories',
    'stock',
    'low-stock',
    'returns',
    'purchases',
  ],

  // Regional Center Officer: Hub distribution and delivery verification
  center_officer: [
    'dashboard',
    'centers',
    'customers',
    'orders',
  ],
};

// Seed staff members
export const INITIAL_STAFF_USERS = [
  {
    id: 'usr-1',
    name: 'Sunil Dissanayake',
    username: 'sunil.admin',
    email: 'sunil@dsfurniture.lk',
    phone: '0771234567',
    role: 'admin',
    branch_code: 'MHG',
    center_code: 'C001',
    status: 'active',
    custom_permissions: null, // null means uses default role preset
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'usr-2',
    name: 'Nuwan Perera',
    username: 'nuwan.sales',
    email: 'nuwan@dsfurniture.lk',
    phone: '0715556778',
    role: 'sales_executive',
    branch_code: 'MHG',
    center_code: 'C001',
    status: 'active',
    custom_permissions: null,
    created_at: '2026-03-15T09:30:00Z',
  },
  {
    id: 'usr-3',
    name: 'Chamari Silva',
    username: 'chamari.cashier',
    email: 'chamari@dsfurniture.lk',
    phone: '0718899221',
    role: 'cashier',
    branch_code: 'MHG',
    center_code: 'C002',
    status: 'active',
    custom_permissions: null,
    created_at: '2026-04-20T10:00:00Z',
  },
  {
    id: 'usr-4',
    name: 'Nalaka Fernando',
    username: 'nalaka.carpentry',
    email: 'nalaka@dsfurniture.lk',
    phone: '0768899001',
    role: 'workshop_supervisor',
    branch_code: 'MRT',
    center_code: 'C001',
    status: 'active',
    custom_permissions: null,
    created_at: '2026-04-01T10:15:00Z',
  },
  {
    id: 'usr-5',
    name: 'Dinesh Kumara',
    username: 'dinesh.hub',
    email: 'dinesh@dsfurniture.lk',
    phone: '0785566778',
    role: 'center_officer',
    branch_code: 'DHW',
    center_code: 'C001',
    status: 'active',
    custom_permissions: null,
    created_at: '2026-07-12T14:20:00Z',
  },
];

export const ROLES_METADATA = {
  admin: {
    key: 'admin',
    label: 'Store Owner / Super Admin',
    shortLabel: 'Super Admin',
    badgeClass: 'badge-wholesale',
    color: '#9333EA',
    bg: 'rgba(147, 51, 234, 0.14)',
    border: 'rgba(147, 51, 234, 0.35)',
    description: 'Full uninhibited access across all financial, inventory, settings, backup, and executive modules.',
    iconName: 'Crown',
  },
  sales_executive: {
    key: 'sales_executive',
    label: 'Sales & Showroom Executive',
    shortLabel: 'Sales Executive',
    badgeClass: 'badge-custom',
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.14)',
    border: 'rgba(37, 99, 235, 0.35)',
    description: 'Manages showroom inquiries, customer bills, advances, and checks product stocks and dimensions.',
    iconName: 'Briefcase',
  },
  cashier: {
    key: 'cashier',
    label: 'Cashier & Billing Executive',
    shortLabel: 'Cashier',
    badgeClass: 'badge-settled',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.14)',
    border: 'rgba(5, 150, 105, 0.35)',
    description: 'Issues official customer invoices, records cash advances, daily cash books, and drawer closing.',
    iconName: 'CheckCircle',
  },
  workshop_supervisor: {
    key: 'workshop_supervisor',
    label: 'Workshop & Carpentry Lead',
    shortLabel: 'Workshop Lead',
    badgeClass: 'badge-showroom',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.14)',
    border: 'rgba(217, 119, 6, 0.35)',
    description: 'Supervises finished furniture additions, raw timber requirements, defect repairs, and stock tallies.',
    iconName: 'Hammer',
  },
  center_officer: {
    key: 'center_officer',
    label: 'Regional Distribution Officer',
    shortLabel: 'Center Officer',
    badgeClass: 'client-badge-has',
    color: '#0284C7',
    bg: 'rgba(2, 132, 199, 0.14)',
    border: 'rgba(2, 132, 199, 0.35)',
    description: 'Oversees regional hub deliveries, client handovers, and center customer directories.',
    iconName: 'Truck',
  },
};

// Storage keys
const USERS_STORAGE_KEY = 'ds_furniture_users_v2';
const ROLE_PERMS_STORAGE_KEY = 'ds_furniture_role_permissions_v2';
const ACTIVE_USER_STORAGE_KEY = 'ds_furniture_active_user_id';

// Helper: Load Saved Users
export const loadSavedUsers = () => {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_STAFF_USERS;
};

// Helper: Save Users
export const saveStaffUsers = (users) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error(e);
  }
};

// Helper: Load Saved Role Permissions
export const loadRolePermissions = () => {
  try {
    const saved = localStorage.getItem(ROLE_PERMS_STORAGE_KEY);
    if (saved) return { ...DEFAULT_ROLE_PERMISSIONS, ...JSON.parse(saved) };
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_ROLE_PERMISSIONS;
};

// Helper: Save Role Permissions
export const saveRolePermissions = (perms) => {
  try {
    localStorage.setItem(ROLE_PERMS_STORAGE_KEY, JSON.stringify(perms));
  } catch (e) {
    console.error(e);
  }
};

// Helper: Get Active User (For Live Persona Simulation)
export const getActiveUser = () => {
  try {
    const users = loadSavedUsers();
    const activeId = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (activeId) {
      const match = users.find((u) => u.id === activeId);
      if (match) return match;
    }
    return users[0] || INITIAL_STAFF_USERS[0];
  } catch {
    return INITIAL_STAFF_USERS[0];
  }
};

// Helper: Set Active User
export const setActiveUser = (userId) => {
  try {
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
  } catch (e) {
    console.error(e);
  }
};

// Helper: Determine if user has access to a specific page
export const hasPageAccess = (user, pageId) => {
  if (!user) return true;
  // If user has custom permissions array set, prioritize that
  if (Array.isArray(user.custom_permissions)) {
    return user.custom_permissions.includes(pageId);
  }
  // Otherwise use their role's permissions
  const rolePerms = loadRolePermissions();
  const allowed = rolePerms[user.role] || [];
  return allowed.includes(pageId);
};
