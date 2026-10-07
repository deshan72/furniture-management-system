import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  RotateCcw,
  Armchair,
  Layers,
  Boxes,
  AlertTriangle,
  Users,
  CircleDollarSign,
  Factory,
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
  LogOut,
  Sparkles,
  ClipboardList,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  badges = { lowStock: 2, outstanding: 1 },
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
        { id: 'returns', label: 'Returns & Repairs', icon: RotateCcw, isPhase2: true },
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
        { id: 'suppliers', label: 'Timber Suppliers', icon: Factory, isPhase2: true },
        { id: 'purchases', label: 'Stock Purchases', icon: ShoppingCart, isPhase2: true },
      ],
    },
    {
      title: 'Reports',
      items: [
        { id: 'reports-sales', label: 'Sales Reports', icon: BarChart3 },
        { id: 'reports-profit', label: 'Profit & Margins', icon: TrendingUp },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'settings', label: 'Store Settings', icon: Settings },
        { id: 'users', label: 'Users & Roles', icon: ShieldCheck, isPhase2: true },
        { id: 'backup', label: 'Backup / Export', icon: Database, isPhase2: true },
      ],
    },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <div className="brand-identity">
          <div className="brand-logo-icon">
            <Sparkles size={20} />
          </div>
          <div className="brand-text-block">
            <div className="brand-name">
              <span>D & D</span>
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
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  className={`nav-item-btn ${isActive ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => setActiveTab(item.id)}
                >
                  <div className="nav-item-content">
                    <span className="nav-icon">
                      <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} />
                    </span>
                    <span className="nav-label">{item.label}</span>
                  </div>

                  {/* Badges / Chips */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`nav-badge ${item.badgeType || 'info'}`}>
                      {item.badge}
                    </span>
                  )}

                  {item.isPhase2 && (
                    <span className="nav-badge phase2">v2</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Profile Card & Logout */}
      <div className="sidebar-footer-card">
        <div className="user-profile-info">
          <div className="user-avatar-circle" title="Don & Danuka (Owner)">
            DD
          </div>
          <div className="user-details">
            <span className="user-name">D & D Furniture</span>
            <span className="user-role-badge">Owner / Admin</span>
          </div>
        </div>

        <button
          className="logout-icon-btn"
          title="Exit / Lock Dashboard"
          onClick={() => alert('D & D Furniture Session Locked')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
