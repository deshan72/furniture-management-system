import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  RotateCcw,
  Armchair,
  Layers,
  Boxes,
  AlertTriangle,
  Users,
  CircleDollarSign,
  ShoppingCart,
  WalletCards,
  Calculator,
  Lock,
  BarChart3,
  TrendingUp,
  Settings,
  ShieldCheck,
  Database,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Building2,
  PlusCircle,
  UserCheck,
} from 'lucide-react';
import { hasPageAccess, ROLES_METADATA } from '../utils/rolesData';

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  badges = { lowStock: 2, outstanding: 1 },
  currentUser,
}) {
  // Navigation sections customized for Furniture Management (No POS)
  const navigationGroups = [
    {
      title: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Orders & Billing',
      items: [
        { id: 'orders', label: 'Orders & Invoices', icon: ClipboardList },
        { id: 'payments', label: 'Payments & Advances', icon: CreditCard },
        { id: 'returns', label: 'Returns & Repairs', icon: RotateCcw },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { id: 'products', label: 'Products Catalog', icon: Armchair },
        { id: 'categories', label: 'Categories', icon: Layers },
        { id: 'stock', label: 'Stock Management', icon: Boxes },
        {
          id: 'low-stock',
          label: 'Low Stock Alerts',
          icon: AlertTriangle,
          badge: badges.lowStock,
          badgeType: 'danger',
        },
      ],
    },
    {
      title: 'Customers',
      items: [
        { id: 'customers', label: 'Customer Directory', icon: Users },
        {
          id: 'outstanding',
          label: 'Outstanding Balances',
          icon: CircleDollarSign,
          badge: badges.outstanding,
          badgeType: 'warning',
        },
      ],
    },
    {
      title: 'Centers',
      items: [
        { id: 'centers', label: 'Center Directory', icon: Building2 },
        { id: 'create-center', label: 'Create Center', icon: PlusCircle },
      ],
    },
    {
      title: 'Finance & Cash',
      items: [
        { id: 'cashbook', label: 'Daily Cash Book', icon: WalletCards },
        { id: 'expenses', label: 'Expenses Tracker', icon: Calculator },
        { id: 'day-close', label: 'Day-End Closing', icon: Lock },
      ],
    },
    {
      title: 'Purchasing',
      items: [
        { id: 'purchases', label: 'Stock Purchases', icon: ShoppingCart },
      ],
    },
    {
      title: 'Reports',
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'reports-profit', label: 'Profit & Margins', icon: TrendingUp },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'settings', label: 'Store Settings', icon: Settings },
        { id: 'users', label: 'Users & Roles', icon: ShieldCheck },
        { id: 'backup', label: 'Backup / Export', icon: Database },
      ],
    },
  ];

  // User meta
  const roleMeta = currentUser ? ROLES_METADATA[currentUser.role] : null;
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DS';

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <div className="brand-identity">
          <div className="brand-logo-icon">
            <img src="/logo-icon.png" alt="D&S Furniture logo" className="brand-logo-img" />
          </div>
          <div className="brand-text-block">
            <div className="brand-name">
              <span>D&S</span>
              <span className="brand-tag">FURNITURE</span>
            </div>
            <div className="brand-status-line">
              <span className="status-dot"></span>
              <span>Workshop & Showroom</span>
            </div>
          </div>
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          className="sidebar-toggle-btn"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Categorized Navigation Menu */}
      <nav className="sidebar-nav-container">
        {navigationGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="nav-group">
            <div className="nav-section-title">{group.title}</div>

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === 'reports' && activeTab === 'reports-sales');
              const isAllowed = hasPageAccess(currentUser, item.id);

              return (
                <button
                  key={item.id}
                  className={`nav-item-btn ${isActive ? 'active' : ''} ${!isAllowed ? 'nav-item-locked' : ''}`}
                  title={isCollapsed ? `${item.label}${!isAllowed ? ' (Locked - Admin Required)' : ''}` : undefined}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    opacity: !isAllowed ? 0.6 : 1,
                  }}
                >
                  <div className="nav-item-content">
                    <span className="nav-icon">
                      <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} />
                    </span>
                    <span className="nav-label">{item.label}</span>
                  </div>

                  {/* Badges / Chips */}
                  {item.badge !== undefined && item.badge > 0 && isAllowed && (
                    <span className={`nav-badge ${item.badgeType || 'info'}`}>
                      {item.badge}
                    </span>
                  )}

                  {/* Lock Indicator if role restricted */}
                  {!isAllowed && (
                    <span
                      title="Admin Authorization Required"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        padding: '2px 4px',
                        fontSize: '0.75rem',
                      }}
                    >
                      <Lock size={12} strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Profile Card */}
      <div
        className="sidebar-footer-card"
        style={{ cursor: 'pointer' }}
        onClick={() => setActiveTab('users')}
        title="Manage Users & Active Persona"
      >
        <div className="user-profile-info">
          <div
            className="user-avatar-circle"
            title={`${currentUser?.name || 'D&S Staff'} (${roleMeta?.shortLabel || 'Admin'})`}
            style={{
              backgroundColor: roleMeta?.bg || 'var(--primary)',
              color: roleMeta?.color || '#ffffff',
              border: `1.5px solid ${roleMeta?.border || 'transparent'}`,
              fontWeight: 700,
            }}
          >
            {initials}
          </div>
          <div className="user-details">
            <span className="user-name">{currentUser?.name || 'D&S Furniture'}</span>
            <span
              className="user-role-badge"
              style={{
                color: roleMeta?.color || 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {roleMeta?.shortLabel || 'Owner / Admin'}
            </span>
          </div>
        </div>

        <button
          className="logout-icon-btn"
          title="Switch User Persona / Manage Roles"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab('users');
          }}
        >
          <UserCheck size={16} />
        </button>
      </div>
    </aside>
  );
}
