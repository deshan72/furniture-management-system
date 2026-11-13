import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar,
  Building2,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  Bell,
  BellRing,
  CheckCheck,
  Check,
  Clock,
  AlertTriangle,
  Wallet,
  Package,
  X,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { formatCenterCode } from '../utils/centersData';

const NOTIFICATIONS_STORAGE_KEY = 'dns_live_notifications_v2';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Low Stock Alert',
    desc: 'Solid Teak 4-Seater Coffee Table stock is below reorder threshold (2 units left).',
    category: 'alerts',
    type: 'warning',
    targetTab: 'low-stock',
    time: '10 min ago',
    read: false,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Weekly Cash Recovery Scheduled',
    desc: 'Active installment accounts due for weekly collection this week.',
    category: 'collections',
    type: 'collection',
    targetTab: 'payments',
    time: '45 min ago',
    read: false,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'Payment Receipt Cleared',
    desc: 'Rs. 6,542.00 installment advance received from Sunil Jayawardena (MHG/C001).',
    category: 'payments',
    type: 'payment',
    targetTab: 'payments',
    time: 'Today, 11:30 AM',
    read: false,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-4',
    title: 'Workshop Production Underway',
    desc: 'Order DS-INV-9186 (New Cupboard) is currently in production at Maharagama workshop.',
    category: 'orders',
    type: 'order',
    targetTab: 'orders',
    time: 'Yesterday',
    read: true,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-5',
    title: 'Customer Credit Reminder',
    desc: 'Rs. 239,664.00 total outstanding balance across 3 registered client profiles.',
    category: 'alerts',
    type: 'warning',
    targetTab: 'customer-overview',
    time: '2 days ago',
    read: true,
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
];

export default function Header({
  title,
  subtitle,
  selectedCenter = 'all',
  onSelectCenter,
  centers = [],
  theme = 'light',
  onToggleTheme,
  onQuickAction,
  quickActionLabel,
  currentUser,
  onLogout,
  onNavigate,
}) {
  const [todayFormatted] = useState(() =>
    new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );

  // Live Notifications State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'alerts' | 'collections' | 'payments' | 'orders'
  const notifRef = useRef(null);

  const [notifications, setNotifications] = useState(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load notifications from storage:', e);
    }
    return INITIAL_NOTIFICATIONS;
  });

  // Save notifications to storage
  const saveNotifications = (newList) => {
    setNotifications(newList);
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {
      console.warn('Failed saving notifications to storage:', e);
    }
  };

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsNotifOpen(false);
      }
    };

    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotifOpen]);

  // Unread Count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Filtered Notifications list
  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'all') return notifications;
    return notifications.filter((n) => n.category === notifFilter);
  }, [notifications, notifFilter]);

  // Mark all notifications as read
  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  // Click on a notification: mark read and navigate
  const handleNotificationClick = (notif) => {
    const updated = notifications.map((n) =>
      n.id === notif.id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
    setIsNotifOpen(false);
    if (onNavigate && notif.targetTab) {
      onNavigate(notif.targetTab);
    }
  };

  // Dismiss / delete single notification
  const handleDismissNotif = (e, notifId) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== notifId);
    saveNotifications(updated);
  };

  // Clear all notifications
  const handleClearAll = () => {
    saveNotifications([]);
  };

  // Reset demo notifications
  const handleResetNotifications = () => {
    saveNotifications(INITIAL_NOTIFICATIONS);
  };

  // Find active center object if selected
  const activeCenter = centers.find((c) => {
    const key = `${c.branch_code?.toUpperCase()}/${formatCenterCode(c.center_code)}`;
    return key === selectedCenter || c.id === selectedCenter;
  });

  // Icon selector based on notification type
  const renderNotifIcon = (type) => {
    switch (type) {
      case 'warning':
        return (
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={17} />
          </div>
        );
      case 'collection':
        return (
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={17} />
          </div>
        );
      case 'payment':
        return (
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Wallet size={17} />
          </div>
        );
      case 'order':
        return (
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#F3E8FF',
              color: '#7E22CE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Package size={17} />
          </div>
        );
      default:
        return (
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#E2E8F0',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={17} />
          </div>
        );
    }
  };

  return (
    <header className="top-header">
      <div className="page-headline">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="header-actions">
        {/* ==========================================
            0. LIVE NOTIFICATIONS DROPDOWN BUTTON
            (Replaces the previous Admin View switch)
            ========================================== */}
        <div className="header-notif-wrapper" ref={notifRef}>
          <button
            type="button"
            className={`header-notif-btn ${isNotifOpen ? 'is-open' : ''}`}
            onClick={() => setIsNotifOpen((prev) => !prev)}
            title="Live System Notifications & Alerts"
            aria-label="Open Live Notifications"
            aria-expanded={isNotifOpen}
          >
            {unreadCount > 0 ? (
              <BellRing size={16} color="#FEF08A" />
            ) : (
              <Bell size={16} />
            )}
            <span style={{ fontSize: '0.78rem' }}>Live Alerts</span>

            {/* Unread Badge Counter */}
            {unreadCount > 0 ? (
              <span className="header-notif-badge">{unreadCount}</span>
            ) : (
              <span className="notif-pulse-dot" title="Live Synced" />
            )}
          </button>

          {/* Interactive Notification Dropdown */}
          {isNotifOpen && (
            <div className="header-notif-dropdown">
              {/* Dropdown Header */}
              <div className="notif-dropdown-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--primary, #1E4D8C)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bell size={15} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        Live Notifications
                      </strong>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          background: '#DCFCE7',
                          color: '#15803D',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16A34A' }} />
                        Live Sync
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '3px 6px',
                        borderRadius: '4px',
                      }}
                      title="Mark all notifications as read"
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                    }}
                    title="Close notifications"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Notification Category Filter Tabs */}
              <div className="notif-tabs-bar">
                <button
                  type="button"
                  className={`notif-tab-btn ${notifFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setNotifFilter('all')}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  className={`notif-tab-btn ${notifFilter === 'alerts' ? 'active' : ''}`}
                  onClick={() => setNotifFilter('alerts')}
                >
                  ⚠️ Alerts ({notifications.filter((n) => n.category === 'alerts').length})
                </button>
                <button
                  type="button"
                  className={`notif-tab-btn ${notifFilter === 'collections' ? 'active' : ''}`}
                  onClick={() => setNotifFilter('collections')}
                >
                  ⏳ Collections ({notifications.filter((n) => n.category === 'collections').length})
                </button>
                <button
                  type="button"
                  className={`notif-tab-btn ${notifFilter === 'payments' ? 'active' : ''}`}
                  onClick={() => setNotifFilter('payments')}
                >
                  💰 Payments ({notifications.filter((n) => n.category === 'payments').length})
                </button>
                <button
                  type="button"
                  className={`notif-tab-btn ${notifFilter === 'orders' ? 'active' : ''}`}
                  onClick={() => setNotifFilter('orders')}
                >
                  📦 Orders ({notifications.filter((n) => n.category === 'orders').length})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="notif-list-container">
                {filteredNotifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--ash-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                      <Check size={20} color="#10B981" />
                    </div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      No notifications in this category
                    </div>
                    <p style={{ fontSize: '0.76rem', margin: '4px 0 10px 0' }}>
                      You are completely caught up with all live events.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetNotifications}
                      style={{
                        background: 'transparent',
                        border: '1px dashed var(--ash-300)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        color: 'var(--primary)',
                      }}
                    >
                      <RotateCcw size={12} style={{ display: 'inline', marginRight: '4px' }} /> Restore Demo Alerts
                    </button>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notif-item ${!notif.read ? 'is-unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {renderNotifIcon(notif.type)}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: !notif.read ? 800 : 700, color: 'var(--text-main)' }}>
                            {notif.title}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {notif.time}
                          </span>
                        </div>

                        <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {notif.desc}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            Open Ledger <ChevronRight size={11} />
                          </span>
                          {!notif.read && (
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#3B82F6',
                              }}
                            />
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDismissNotif(e, notif.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-faint, #94a3b8)',
                          cursor: 'pointer',
                          padding: '2px',
                          borderRadius: '4px',
                          opacity: 0.6,
                        }}
                        title="Dismiss notification"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="notif-dropdown-footer">
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Clear all alerts from feed"
                >
                  <Trash2 size={12} /> Clear all
                </button>

                <span style={{ color: 'var(--text-faint)', fontSize: '0.72rem' }}>
                  {unreadCount} unread • Synced with workshop
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ==========================================
            1. REGIONAL CENTER FILTER SELECTOR
            ========================================== */}
        {onSelectCenter && (
          <div
            className={`header-center-pill ${selectedCenter !== 'all' ? 'is-active' : ''}`}
            title="Filter data by Regional Distribution Center"
          >
            <div className="header-pill-left">
              <Building2 size={16} className="header-center-icon" />
              <div className="header-center-text">
                <span className="header-center-sub">Center</span>
                <span className="header-center-title">
                  {selectedCenter === 'all'
                    ? 'All Centers'
                    : activeCenter
                    ? `${activeCenter.branch_code} / ${formatCenterCode(activeCenter.center_code)}`
                    : selectedCenter}
                </span>
              </div>
            </div>

            {selectedCenter !== 'all' && (
              <span className="header-center-tag">
                {activeCenter?.city || 'Active'}
              </span>
            )}

            <ChevronDown size={14} className="header-chevron" />

            {/* Native Accessible Overlay Dropdown */}
            <select
              className="header-center-native-select"
              value={selectedCenter}
              onChange={(e) => onSelectCenter(e.target.value)}
              aria-label="Filter by Regional Center"
            >
              <option value="all">🌐 All Centers — All Regional Hubs</option>
              {centers.map((cntr) => {
                const centerKey = `${cntr.branch_code?.toUpperCase()}/${formatCenterCode(cntr.center_code)}`;
                return (
                  <option key={cntr.id || centerKey} value={centerKey}>
                    📍 {cntr.branch_code} / {formatCenterCode(cntr.center_code)} — {cntr.name} ({cntr.city})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* ==========================================
            2. DARK / LIGHT THEME TOGGLE SWITCH
            ========================================== */}
        {onToggleTheme && (
          <button
            type="button"
            className={`header-theme-toggle ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
            onClick={onToggleTheme}
            title={
              theme === 'dark'
                ? 'Switch to Light Mode'
                : 'Switch to Dark Mode'
            }
            aria-label="Toggle dark and light mode"
          >
            <span className="theme-toggle-track">
              <Sun size={13} className="theme-icon sun-icon" />
              <Moon size={13} className="theme-icon moon-icon" />
              <span className="theme-toggle-thumb" />
            </span>
            <span className="theme-toggle-label">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
        )}

        {/* ==========================================
            3. CURRENT DATE BADGE
            ========================================== */}
        <div className="header-date-pill" title="Today's Operational Date">
          <Calendar size={15} className="header-date-icon" />
          <span>{todayFormatted}</span>
        </div>

        {/* ==========================================
            4. LOG OUT ACTION (LOCKED IN LINE)
            ========================================== */}
        {onLogout && (
          <button
            type="button"
            className="header-logout-btn"
            onClick={() => {
              if (window.confirm('Are you sure you want to log out of D N S Home Solutions?')) {
                onLogout();
              }
            }}
            title="Log out of system and return to login screen"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        )}

        {/* Quick Action Button if any */}
        {quickActionLabel && onQuickAction && (
          <button className="btn btn-primary" onClick={onQuickAction}>
            {quickActionLabel}
          </button>
        )}
      </div>
    </header>
  );
}
