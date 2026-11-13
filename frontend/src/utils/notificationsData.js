/**
 * D&D Furniture Management System - Central Live Notifications Engine
 * Handles real-time system notifications for:
 * - Orders (New orders placed, status updates, delivery)
 * - Payments & Advances (Cash collections, loan installments, full settlements)
 * - Customer Directory (New client registrations, loan limits)
 * - Alerts & Inventory (Low stock, cash recovery schedules)
 */

import { normalizeActiveTab } from './navigationUtils';

export const NOTIFICATIONS_STORAGE_KEY = 'dns_live_notifications_v2';

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-init-1',
    title: 'Low Stock Alert',
    desc: 'Solid Teak 4-Seater Coffee Table stock is below reorder threshold (2 units left).',
    category: 'alerts',
    type: 'warning',
    targetTab: 'low-stock',
    read: false,
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-init-2',
    title: 'Weekly Cash Recovery Scheduled',
    desc: 'Active installment accounts due for weekly collection this week.',
    category: 'collections',
    type: 'collection',
    targetTab: 'payments',
    read: false,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-init-3',
    title: 'Payment Receipt Cleared',
    desc: 'Rs. 6,542.00 installment advance received from Sunil Jayawardena (MHG/C001).',
    category: 'payments',
    type: 'payment',
    targetTab: 'payments',
    read: false,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-init-4',
    title: 'Workshop Production Underway',
    desc: 'Order DS-INV-9186 (New Cupboard) is currently in production at Maharagama workshop.',
    category: 'orders',
    type: 'order',
    targetTab: 'orders',
    read: true,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-init-5',
    title: 'Customer Credit Reminder',
    desc: 'Rs. 239,664.00 total outstanding balance across 3 registered client profiles.',
    category: 'alerts',
    type: 'warning',
    targetTab: 'customer-overview',
    read: true,
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
];

/**
 * Convert ISO timestamp into a friendly human relative time string
 */
export const formatRelativeTime = (isoString) => {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Just now';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 45) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1 || (diffHours < 48 && date.getDate() === now.getDate() - 1)) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return 'Just now';
  }
};

/**
 * Load notifications from localStorage and compute fresh relative timestamps
 */
// In-memory copy: the source of truth during this session, so notifications
// still work even if localStorage is full or unavailable.
let memoryNotifications = null;

const withTimes = (list) =>
  list.map((n) => ({
    ...n,
    targetTab: normalizeActiveTab(n.targetTab || n.linkTab || 'dashboard'),
    desc: n.desc || n.message || '',
    time: formatRelativeTime(n.created_at),
  }));

export const loadSavedNotifications = () => {
  if (Array.isArray(memoryNotifications)) return withTimes(memoryNotifications);
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      // An empty array is valid (user cleared everything) - do NOT reseed.
      if (Array.isArray(parsed)) {
        memoryNotifications = parsed;
        return withTimes(parsed);
      }
    }
  } catch (e) {
    console.warn('Failed to load notifications from storage:', e);
  }
  memoryNotifications = INITIAL_NOTIFICATIONS.map((n) => ({ ...n }));
  return withTimes(memoryNotifications);
};

/**
 * Save notifications list to localStorage and broadcast real-time update event
 */
export const saveNotificationsToStorage = (newList) => {
  memoryNotifications = newList.map(({ time, ...rest }) => rest);
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(memoryNotifications));
  } catch (e) {
    console.warn('Failed saving notifications to storage:', e);
  }
  // Always broadcast, even if storage failed
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dns:notification_update'));
  }
};

/**
 * Add a live notification to the system and immediately broadcast to the Header
 * @param {Object} param0 
 * @param {string} param0.title - Short header (e.g. "New Order Created")
 * @param {string} param0.desc - Detailed description with amounts and names
 * @param {'orders'|'payments'|'collections'|'alerts'} [param0.category='orders'] - Notification category tab
 * @param {'order'|'payment'|'collection'|'warning'|'success'|'info'} [param0.type='order'] - Notification visual icon type
 * @param {string} [param0.targetTab='orders'] - Target navigation view when clicked
 */
export const addLiveNotification = ({
  title,
  desc,
  message,
  category = 'orders',
  type = 'order',
  targetTab,
  linkTab,
}) => {
  try {
    const current = loadSavedNotifications();
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      desc: desc || message || '',
      category,
      type,
      targetTab: normalizeActiveTab(targetTab || linkTab || 'orders'),
      read: false,
      created_at: new Date().toISOString(),
      time: 'Just now',
    };
    // Keep newest 50 notifications
    const updated = [newNotif, ...current.filter((n) => n.id !== newNotif.id)].slice(0, 50);
    saveNotificationsToStorage(updated);
    return newNotif;
  } catch (e) {
    console.warn('Failed to add live notification:', e);
    return null;
  }
};


// Cross-tab sync: drop the in-memory copy when another tab changes storage
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === NOTIFICATIONS_STORAGE_KEY) memoryNotifications = null;
  });
}
