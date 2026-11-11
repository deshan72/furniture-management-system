// System Modules and Page-Level Permissions for D&S Furniture System

export const SYSTEM_MODULES = [
  // Main
  {
    id: 'dashboard',
    label: 'Executive Dashboard',
    category: 'Main',
    description: 'Central business KPI metrics, showroom cash in hand, and distribution center statistics.',
    sensitivity: 'Standard',
  },

  // Orders & Billing
  {
    id: 'orders',
    label: 'Orders & Invoices',
    category: 'Orders & Billing',
    description: 'Create furniture orders, generate printable invoices, calculate advance payments and balances.',
    sensitivity: 'Operational',
  },
  {
    id: 'payments',
    label: 'Payments & Advances',
    category: 'Orders & Billing',
    description: 'Record customer deposit slips, installment payments, and official cash receipts.',
    sensitivity: 'Operational',
  },
  {
    id: 'returns',
    label: 'Returns & Repairs',
    category: 'Orders & Billing',
    description: 'Defective furniture warranty claims, carpentry polish repairs, and customer exchanges.',
    sensitivity: 'Operational',
  },

  // Inventory
  {
    id: 'products',
    label: 'Products Catalog',
    category: 'Inventory',
    description: 'Solid Teak, Mahogany, Melamine & Electrical furniture models, dimensions, and prices.',
    sensitivity: 'Operational',
  },
  {
    id: 'categories',
    label: 'Product Categories',
    category: 'Inventory',
    description: 'Classify items into Living Room, Bedroom, Dining, Kitchen, and Office suites.',
    sensitivity: 'Standard',
  },
  {
    id: 'stock',
    label: 'Stock Management',
    category: 'Inventory',
    description: 'Track physical warehouse inventory, warehouse adjustments, and finished carpentry stock.',
    sensitivity: 'Operational',
  },
  {
    id: 'low-stock',
    label: 'Low Stock Alerts',
    category: 'Inventory',
    description: 'Automated warnings when finished furniture pieces drop below reorder safety thresholds.',
    sensitivity: 'Operational',
  },

  // Customers
  {
    id: 'customers',
    label: 'Customer Directory',
    category: 'Customers',
    description: 'Client contact database, delivery addresses, National Identity Cards (NIC), and order records.',
    sensitivity: 'Operational',
  },
  {
    id: 'outstanding',
    label: 'Outstanding Balances',
    category: 'Customers',
    description: 'Customer credit ledger, debt recovery lists, overdue balance tracking, and WhatsApp follow-ups.',
    sensitivity: 'Financial',
  },

  // Centers
  {
    id: 'centers',
    label: 'Center Directory',
    category: 'Centers',
    description: 'View regional distribution hubs (MHG, MRT, NGB, DHW, CMB), branch officers, and hub phones.',
    sensitivity: 'Standard',
  },
  {
    id: 'create-center',
    label: 'Create Regional Center',
    category: 'Centers',
    description: 'Register new regional showroom distribution centers and assign branch codes (C001 format).',
    sensitivity: 'System Critical',
  },
  {
    id: 'add-client-to-center',
    label: 'Add Client to Center',
    category: 'Centers',
    description: 'Register or assign customer profiles directly to regional distribution centers.',
    sensitivity: 'Standard',
  },

  // Finance & Cash
  {
    id: 'cashbook',
    label: 'Daily Cash Book',
    category: 'Finance & Cash',
    description: 'Record day-to-day cash drawer receipts, cash payments, petty cash, and daily turnover.',
    sensitivity: 'Financial',
  },
  {
    id: 'expenses',
    label: 'Expenses Tracker',
    category: 'Finance & Cash',
    description: 'Workshop timber purchases, hardware, lacquer, carpenter wages, transport, and showroom rent.',
    sensitivity: 'Financial',
  },
  {
    id: 'day-close',
    label: 'Day-End Closing',
    category: 'Finance & Cash',
    description: 'Reconcile actual physical cash in drawer against sales receipts before showroom closing.',
    sensitivity: 'Financial',
  },

  // Purchasing
  {
    id: 'purchases',
    label: 'Stock Purchases',
    category: 'Purchasing',
    description: 'Raw timber logs, teak boards, melamine sheets, hardware, and cushion supplier procurement.',
    sensitivity: 'Operational',
  },

  // Reports
  {
    id: 'reports',
    label: 'Reports',
    category: 'Reports',
    description: 'Audit and export Sales Turnover, Credit Ledger, Inventory Valuation, Cash Flow, and Workshop Costs in CSV & PDF.',
    sensitivity: 'Operational',
  },
  {
    id: 'reports-profit',
    label: 'Profit & Margins',
    category: 'Reports',
    description: 'Confidential gross profit margins, carpentry labor costing vs selling price analysis.',
    sensitivity: 'Financial',
  },

  // Administration
  {
    id: 'settings',
    label: 'Store Settings',
    category: 'Administration',
    description: 'Showroom branding, invoice prefixes, 10-year Teak warranty terms, and bank accounts.',
    sensitivity: 'System Critical',
  },
  {
    id: 'users',
    label: 'Users & Roles',
    category: 'Administration',
    description: 'Configure Administrator and Executive role page access control privileges.',
    sensitivity: 'System Critical',
  },
  {
    id: 'backup',
    label: 'Backup / Export',
    category: 'Administration',
    description: 'Download full system JSON backup archives, export CSV tables, and database restore.',
    sensitivity: 'System Critical',
  },
];

// Default Permission Presets by Role
export const DEFAULT_ROLE_PERMISSIONS = {
  // Super Admin: All 21 modules unconditionally allowed
  admin: SYSTEM_MODULES.map((m) => m.id),

  // Executive Staff: Operational modules allowed by default
  executive: [
    'dashboard',
    'orders',
    'payments',
    'returns',
    'products',
    'categories',
    'stock',
    'low-stock',
    'customers',
    'outstanding',
    'centers',
    'add-client-to-center',
    'reports',
    'reports-sales',
  ],
};

// Role Metadata Definitions
export const ROLES_METADATA = {
  admin: {
    key: 'admin',
    label: 'Administrator (Super Admin / Owner)',
    shortLabel: 'Super Admin',
    title_si: 'Super Administrator Role',
    badgeClass: 'badge-wholesale',
    color: '#9333EA',
    bg: 'rgba(147, 51, 234, 0.14)',
    border: 'rgba(147, 51, 234, 0.35)',
    description: 'Full uninhibited access across all 21 modules including Profit Margins, Day-End Balancing, Store Settings, Data Backups, and Permission Management.',
    iconName: 'Crown',
  },
  executive: {
    key: 'executive',
    label: 'Executive Staff (Showroom & Operations)',
    shortLabel: 'Executive Staff',
    title_si: 'Executive Staff Role',
    badgeClass: 'badge-custom',
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.14)',
    border: 'rgba(37, 99, 235, 0.35)',
    description: 'Operational privileges for showroom sales, order billing, checking furniture stocks, customer directory, and distribution centers. Confidential finance and admin pages can be toggled by the Admin.',
    iconName: 'Briefcase',
  },
};

// Storage keys
const ROLE_PERMS_STORAGE_KEY = 'ds_furniture_role_permissions_v3';
const ACTIVE_ROLE_STORAGE_KEY = 'ds_furniture_active_role';
const ROLES_CATALOG_STORAGE_KEY = 'ds_furniture_roles_catalog_v2';

// Baseline System Roles Definition
export const INITIAL_SYSTEM_ROLES = [
  {
    id: 'admin',
    name: 'Administrator (Super Admin / Owner)',
    name_si: 'Administrator (Super Admin / Owner)',
    shortLabel: 'Super Admin',
    badgeClass: 'badge-wholesale',
    color: '#9333EA',
    bg: 'rgba(147, 51, 234, 0.14)',
    border: 'rgba(147, 51, 234, 0.35)',
    description: 'Full uninhibited access across all 21 modules including Profit Margins, Day-End Balancing, Store Settings, Data Backups, and Permission Management.',
    isSystem: true,
    canDelete: false,
    permissions: SYSTEM_MODULES.map((m) => m.id),
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'executive',
    name: 'Executive Staff (Showroom & Operations)',
    name_si: 'Executive Staff (Showroom & Operations)',
    shortLabel: 'Executive Staff',
    badgeClass: 'badge-custom',
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.14)',
    border: 'rgba(37, 99, 235, 0.35)',
    description: 'Operational privileges for showroom sales, order billing, checking furniture stocks, customer directory, and distribution centers.',
    isSystem: true,
    canDelete: false,
    permissions: [
      'dashboard',
      'orders',
      'payments',
      'returns',
      'products',
      'categories',
      'stock',
      'low-stock',
      'customers',
      'outstanding',
      'centers',
      'reports',
      'reports-sales',
    ],
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
];

// Helper: Load All Roles (System + Custom Roles)
export const loadAllRoles = () => {
  try {
    const saved = localStorage.getItem(ROLES_CATALOG_STORAGE_KEY);
    let roles = [];
    if (saved) {
      roles = JSON.parse(saved);
    }
    if (!Array.isArray(roles) || roles.length === 0) {
      roles = [...INITIAL_SYSTEM_ROLES];
    }

    // Synchronize latest executive permissions from legacy storage if present
    const legacyPerms = loadRolePermissions();
    roles = roles.map((r) => {
      // Force clean English identity for baseline system roles
      if (r.id === 'admin') {
        return {
          ...r,
          name: 'Administrator (Super Admin / Owner)',
          name_si: 'Super Administrator',
          description: INITIAL_SYSTEM_ROLES[0].description,
          permissions: SYSTEM_MODULES.map((m) => m.id),
        };
      }
      if (r.id === 'executive') {
        return {
          ...r,
          name: 'Executive Staff (Showroom & Operations)',
          name_si: 'Executive Staff',
          description: INITIAL_SYSTEM_ROLES[1].description,
          permissions: legacyPerms?.executive || r.permissions || INITIAL_SYSTEM_ROLES[1].permissions,
        };
      }

      // Sanitize custom roles to remove any legacy Sinhala characters
      const cleanName = (r.name || '').replace(/[\u0D80-\u0DFF]/g, '').trim();
      const cleanNameSi = (r.name_si || '').replace(/[\u0D80-\u0DFF]/g, '').trim();
      const cleanDesc = (r.description || '').replace(/[\u0D80-\u0DFF]/g, '').trim();

      return {
        ...r,
        name: cleanName || 'Custom Role',
        name_si: cleanNameSi || r.shortLabel || 'Custom Role',
        description: cleanDesc || 'Custom organizational staff role.',
      };
    });

    // Ensure system roles (admin & executive) are always present
    const hasAdmin = roles.some((r) => r.id === 'admin');
    const hasExec = roles.some((r) => r.id === 'executive');
    if (!hasAdmin) roles.unshift(INITIAL_SYSTEM_ROLES[0]);
    if (!hasExec) roles.splice(1, 0, INITIAL_SYSTEM_ROLES[1]);

    // Persist cleaned roles back to localStorage immediately
    try {
      localStorage.setItem(ROLES_CATALOG_STORAGE_KEY, JSON.stringify(roles));
    } catch {
      // ignore storage errors
    }

    return roles;
  } catch (e) {
    console.error(e);
    return INITIAL_SYSTEM_ROLES;
  }
};

// Helper: Save / Update a Role (CRUD Create / Update)
export const saveRole = (roleData) => {
  try {
    const roles = loadAllRoles();
    const isNew = !roleData.id;
    const roleId = roleData.id || `custom_${Date.now()}`;

    const newRoleObj = {
      id: roleId,
      name: roleData.name || 'New Custom Role',
      name_si: roleData.name_si || roleData.name || 'New Custom Role',
      shortLabel: roleData.shortLabel || (roleData.name ? roleData.name.slice(0, 5).toUpperCase() : 'CUSTOM'),
      badgeClass: roleData.badgeClass || 'badge-custom',
      color: roleData.color || '#059669',
      bg: roleData.bg || 'rgba(5, 150, 105, 0.14)',
      border: roleData.border || 'rgba(5, 150, 105, 0.35)',
      description: roleData.description || 'Custom organizational staff role.',
      isSystem: roleId === 'admin' || roleId === 'executive',
      canDelete: roleId !== 'admin' && roleId !== 'executive',
      permissions: Array.isArray(roleData.permissions) ? roleData.permissions : ['dashboard'],
      status: roleData.status || 'Active',
      updated_at: new Date().toISOString(),
    };

    let updatedRoles = [];
    if (isNew) {
      updatedRoles = [...roles, { ...newRoleObj, created_at: new Date().toISOString() }];
    } else {
      updatedRoles = roles.map((r) => (r.id === roleId ? { ...r, ...newRoleObj } : r));
    }

    localStorage.setItem(ROLES_CATALOG_STORAGE_KEY, JSON.stringify(updatedRoles));

    // Keep legacy storage in sync for executive role
    if (roleId === 'executive') {
      saveRolePermissions({
        admin: SYSTEM_MODULES.map((m) => m.id),
        executive: newRoleObj.permissions,
      });
    }

    return newRoleObj;
  } catch (e) {
    console.error(e);
    return null;
  }
};

// Helper: Delete a Custom Role (CRUD Delete)
export const deleteRole = (roleId) => {
  if (roleId === 'admin' || roleId === 'executive') {
    return { success: false, message: 'Core system roles (Administrator / Executive) cannot be deleted.' };
  }
  try {
    const roles = loadAllRoles();
    const filtered = roles.filter((r) => r.id !== roleId);
    localStorage.setItem(ROLES_CATALOG_STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: e.message };
  }
};

// Helper: Reset Role to Factory Defaults
export const resetRoleToDefaults = (roleId) => {
  try {
    if (roleId === 'admin') return INITIAL_SYSTEM_ROLES[0];
    if (roleId === 'executive') {
      const defaultExecPerms = DEFAULT_ROLE_PERMISSIONS.executive;
      saveRolePermissions({
        admin: SYSTEM_MODULES.map((m) => m.id),
        executive: defaultExecPerms,
      });
      const roles = loadAllRoles();
      const updated = roles.map((r) =>
        r.id === 'executive' ? { ...r, permissions: defaultExecPerms } : r
      );
      localStorage.setItem(ROLES_CATALOG_STORAGE_KEY, JSON.stringify(updated));
      return updated.find((r) => r.id === 'executive');
    }
  } catch (e) {
    console.error(e);
  }
  return null;
};

// Helper: Load Saved Role Permissions
export const loadRolePermissions = () => {
  try {
    const saved = localStorage.getItem(ROLE_PERMS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        admin: DEFAULT_ROLE_PERMISSIONS.admin, // Admin always has all
        executive: Array.isArray(parsed.executive) ? parsed.executive : DEFAULT_ROLE_PERMISSIONS.executive,
      };
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_ROLE_PERMISSIONS;
};

// Helper: Save Role Permissions
export const saveRolePermissions = (perms) => {
  try {
    const payload = {
      admin: DEFAULT_ROLE_PERMISSIONS.admin,
      executive: Array.isArray(perms.executive) ? perms.executive : DEFAULT_ROLE_PERMISSIONS.executive,
    };
    localStorage.setItem(ROLE_PERMS_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error(e);
  }
};

// Helper: Get Active Simulated Role (admin | executive)
export const getActiveRole = () => {
  try {
    const saved = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
    if (saved === 'executive' || saved === 'admin') return saved;
  } catch {
    // fallback
  }
  return 'admin';
};

// Helper: Set Active Role
export const setActiveRole = (role) => {
  try {
    localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role);
  } catch (e) {
    console.error(e);
  }
};

// Helper: Determine if a role has access to a specific page
export const hasPageAccess = (roleOrUser, pageId) => {
  let role = 'admin';
  if (typeof roleOrUser === 'string') {
    role = roleOrUser;
  } else if (roleOrUser && typeof roleOrUser === 'object') {
    role = roleOrUser.role || 'admin';
  }

  // Admin has unconditional access to all modules
  if (role === 'admin') return true;

  // The Users & Roles page and Main Dashboard are ALWAYS accessible to avoid lockout
  if (pageId === 'users' || pageId === 'dashboard') return true;

  // Intercept reports aliases
  const targetIds =
    pageId === 'reports' || pageId === 'reports-sales'
      ? ['reports', 'reports-sales']
      : [pageId];

  // Check from live roles catalog
  try {
    const roles = loadAllRoles();
    const matched = roles.find((r) => r.id === role);
    if (matched && Array.isArray(matched.permissions)) {
      return targetIds.some((id) => matched.permissions.includes(id));
    }
  } catch (e) {
    console.error(e);
  }

  // Fallback to legacy executive permissions
  const rolePerms = loadRolePermissions();
  const allowed = rolePerms.executive || DEFAULT_ROLE_PERMISSIONS.executive;
  return targetIds.some((id) => allowed.includes(id));
};

// Helper: Get Active User object based on active role
export const getActiveUser = () => {
  const role = getActiveRole();
  if (role === 'executive') {
    return {
      id: 'usr_exec',
      name: 'Executive Staff',
      role: 'executive',
      email: 'executive@dsfurniture.lk',
      branch: 'Showroom & Field',
    };
  }
  return {
    id: 'usr_admin',
    name: 'D&S Administrator',
    role: 'admin',
    email: 'admin@dsfurniture.lk',
    branch: 'Owner / Super Admin',
  };
};

// Helper: Export saved roles/users for system backup/export
export const loadSavedUsers = () => {
  return [
    {
      id: 'usr_admin',
      name: 'D&S Administrator',
      role: 'admin',
      email: 'admin@dsfurniture.lk',
      phone: '+94 77 123 4567',
      assignedCenter: 'all',
      status: 'Active',
    },
    {
      id: 'usr_exec',
      name: 'Executive Staff',
      role: 'executive',
      email: 'executive@dsfurniture.lk',
      phone: '+94 77 987 6543',
      assignedCenter: 'all',
      status: 'Active',
    },
  ];
};
