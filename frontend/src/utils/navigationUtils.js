/**
 * Central tab normalizer: every notification click, sidebar navigation, URL hash
 * and link is mapped to a valid view so the page never goes blank.
 */

export const KNOWN_TABS = [
  'dashboard',
  'orders',
  'payments',
  'returns',
  'products',
  'categories',
  'stock',
  'low-stock',
  'customers',
  'customer-overview',
  'outstanding',
  'centers',
  'create-center',
  'add-client-to-center',
  'suppliers',
  'purchases',
  'cashbook',
  'expenses',
  'day-close',
  'reports',
  'reports-sales',
  'reports-profit',
  'settings',
  'users',
  'backup',
];

const TAB_ALIASES = {
  'customer-directory': 'customers',
  customer_directory: 'customers',
  customer: 'customers',
  clients: 'customers',
  client: 'customers',
  customer_overview: 'customer-overview',
  'client-overview': 'customer-overview',
  debt: 'customer-overview',
  overdue: 'customer-overview',

  'center-directory': 'centers',
  center_directory: 'centers',
  center: 'centers',
  hubs: 'centers',
  create_center: 'create-center',
  'add-center': 'create-center',
  add_client_to_center: 'add-client-to-center',

  'products-catalog': 'products',
  'product-catalog': 'products',
  catalog: 'products',
  inventory: 'products',
  'stock-management': 'stock',
  stock_management: 'stock',
  'low-stock-alerts': 'low-stock',
  low_stock: 'low-stock',
  low_stock_alerts: 'low-stock',
  stock_alert: 'low-stock',
  stock_alerts: 'low-stock',
  reorder: 'low-stock',

  'orders-invoices': 'orders',
  order: 'orders',
  invoices: 'orders',
  invoice: 'orders',
  'payments-advances': 'payments',
  payment: 'payments',
  collections: 'payments',
  collection: 'payments',
  advances: 'payments',
  'returns-repairs': 'returns',
  repairs: 'returns',
  repair: 'returns',

  'stock-purchases': 'purchases',
  stock_purchases: 'purchases',
  grn: 'purchases',
  purchase: 'purchases',

  'cash-book': 'cashbook',
  expense: 'expenses',
  'day-end': 'day-close',
  day_close: 'day-close',

  'sales-report': 'reports',
  'profit-margins': 'reports-profit',
  margins: 'reports-profit',
  analytics: 'reports',

  'store-settings': 'settings',
  roles: 'users',
  permissions: 'users',
  export: 'backup',
};

export const normalizeActiveTab = (rawTab) => {
  if (!rawTab || typeof rawTab !== 'string') return 'dashboard';

  const clean = rawTab
    .trim()
    .replace(/^#\/?/, '')
    .replace(/^\//, '')
    .split('?')[0]
    .toLowerCase();

  if (!clean) return 'dashboard';
  if (KNOWN_TABS.includes(clean)) return clean;
  if (TAB_ALIASES[clean]) return TAB_ALIASES[clean];

  return 'dashboard';
};

