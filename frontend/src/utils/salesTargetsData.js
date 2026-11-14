// Sales Targets Data Store for D N S Home Solutions
// Enables Super Admin to create, edit, and assign performance sales targets to Executives

import { formatLKR, formatDate } from './formatters';
import { formatCenterCode } from './centersData';

export const TARGETS_STORAGE_KEY = 'dns_sales_targets_v1';

export const INITIAL_TARGETS = [
  {
    id: 'trg-101',
    title: 'November Regional Furniture Target',
    target_amount: 500000,
    target_clients_count: 8,
    start_date: '2026-11-01',
    end_date: '2026-11-30',
    target_period: 'monthly',
    assigned_to_user_id: 'usr_exec_001',
    assigned_to_name: 'Executive Staff',
    assigned_to_role: 'executive',
    center_code: 'C003',
    status: 'active',
    notes: 'Focus on Teak dining sets and bedroom suites in Maththegoda and Colombo South areas.',
    created_by: 'D N S Administrator',
    created_at: '2026-11-01T08:00:00Z',
    updated_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'trg-102',
    title: 'Bi-Weekly Living Room Promotion Target',
    target_amount: 350000,
    target_clients_count: 5,
    start_date: '2026-11-10',
    end_date: '2026-11-25',
    target_period: 'bi-weekly',
    assigned_to_user_id: 'usr_exec_001',
    assigned_to_name: 'Executive Staff',
    assigned_to_role: 'executive',
    center_code: 'all',
    status: 'active',
    notes: 'Showroom ready stock wardrobes, TV consoles, and melamine executive desks.',
    created_by: 'D N S Administrator',
    created_at: '2026-11-10T09:30:00Z',
    updated_at: '2026-11-10T09:30:00Z',
  },
];

// Load saved targets from localStorage
export const loadSavedTargets = () => {
  try {
    const raw = localStorage.getItem(TARGETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed loading sales targets from localStorage:', err);
  }
  // Initialize storage
  try {
    localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(INITIAL_TARGETS));
  } catch {}
  return INITIAL_TARGETS;
};

// Check if a sales target is assigned to a specific user (Executive)
export const isTargetAssignedToUser = (target, user) => {
  if (!user || !target) return false;

  const userId = String(user.id || '').trim().toLowerCase();
  const userName = String(user.name || '').trim().toLowerCase();
  const userEmail = String(user.email || '').trim().toLowerCase();

  const targetUserId = String(target.assigned_to_user_id || '').trim().toLowerCase();
  const targetUserName = String(target.assigned_to_name || '').trim().toLowerCase();
  const targetUserEmail = String(target.assigned_to_email || '').trim().toLowerCase();

  // Match by user ID
  if (targetUserId && userId && targetUserId === userId) return true;
  // Match by email
  if (targetUserEmail && userEmail && targetUserEmail === userEmail) return true;
  // Match by full name
  if (targetUserName && userName && targetUserName === userName) return true;

  // Fallback: If executive user and target explicitly assigned to 'Executive Staff' or generic executive id
  if (user.role === 'executive' && (targetUserId === 'usr_exec_001' || targetUserName === 'executive staff')) {
    return true;
  }

  return false;
};

// Save targets to localStorage and dispatch custom event
export const saveTargetsToStorage = (targetsList) => {
  try {
    localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targetsList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dns_sales_targets_updated', { detail: targetsList }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (err) {
    console.warn('Failed saving sales targets to localStorage:', err);
  }
};

// Calculates live achievement metrics comparing a target against real orders
export const calculateTargetProgress = (target, orders = [], customers = []) => {
  if (!target) {
    return {
      achievedAmount: 0,
      achievedClientsCount: 0,
      amountPercentage: 0,
      clientsPercentage: 0,
      shortfallAmount: 0,
      shortfallClients: 0,
      isAchieved: false,
      daysRemaining: 0,
      isExpired: false,
      matchingOrders: [],
    };
  }

  const targetAmount = Number(target.target_amount) || 0;
  const targetClients = Number(target.target_clients_count) || 1;
  const startDateStr = target.start_date || '2000-01-01';
  const endDateStr = target.end_date || '2099-12-31';
  const targetCenter = target.center_code && target.center_code !== 'all' ? formatCenterCode(target.center_code) : null;

  // Filter orders matching this target's date range and center (if center-specific)
  const matchingOrders = orders.filter((o) => {
    if (o.status === 'Cancelled') return false;

    // Date range check
    const oDate = o.date || (o.created_at ? o.created_at.slice(0, 10) : '');
    if (oDate) {
      if (oDate < startDateStr || oDate > endDateStr) {
        return false;
      }
    }

    // Center match if target is center-bound
    if (targetCenter) {
      const oCenter = formatCenterCode(o.center_code);
      const oContract = String(o.contract_no || '');
      if (oCenter !== targetCenter && !oContract.includes(`/${targetCenter}/`)) {
        return false;
      }
    }

    return true;
  });

  // Calculate total achieved sales amount
  const achievedAmount = matchingOrders.reduce((sum, o) => {
    const amt = Number(o.gross_amount) || Number(o.unit_price) * (Number(o.quantity) || 1) || 0;
    return sum + amt;
  }, 0);

  // Calculate unique clients closed in this period
  const uniqueClients = new Set();
  matchingOrders.forEach((o) => {
    const key = o.customer_nic || o.customer_id || o.customer_name;
    if (key) uniqueClients.add(key);
  });
  const achievedClientsCount = uniqueClients.size;

  const amountPercentage = targetAmount > 0 ? Math.round((achievedAmount / targetAmount) * 100) : 0;
  const clientsPercentage = targetClients > 0 ? Math.round((achievedClientsCount / targetClients) * 100) : 0;
  const shortfallAmount = Math.max(0, targetAmount - achievedAmount);
  const shortfallClients = Math.max(0, targetClients - achievedClientsCount);

  // Deadline countdown calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(endDateStr);
  deadline.setHours(0, 0, 0, 0);
  const diffTime = deadline.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;
  const isAchieved = achievedAmount >= targetAmount && achievedClientsCount >= targetClients;

  return {
    achievedAmount,
    achievedClientsCount,
    amountPercentage,
    clientsPercentage,
    shortfallAmount,
    shortfallClients,
    isAchieved,
    daysRemaining,
    isExpired,
    matchingOrders,
  };
};

