import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft, Lock, Crown } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import CentersPage from './pages/CentersPage';
import OrdersPage from './pages/OrdersPage';
import CashHandlingPage from './pages/CashHandlingPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import BackupPage from './pages/BackupPage';
import { loadSavedCenters } from './utils/centersData';
import { getActiveUser, setActiveRole, hasPageAccess, ROLES_METADATA } from './utils/rolesData';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Active User / Persona State
  const [currentUser, setCurrentUser] = useState(() => getActiveUser());

  // One-click role switch handler
  const handleSwitchRole = (newRole) => {
    setActiveRole(newRole);
    setCurrentUser(getActiveUser());
  };

  // Theme State: 'light' | 'dark'
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // fallback
    }
    return 'light';
  });

  // Selected Regional Center State: 'all' | 'BRANCH/C001'
  const [selectedCenter, setSelectedCenter] = useState(() => {
    try {
      return localStorage.getItem('dnd_active_center') || 'all';
    } catch {
      return 'all';
    }
  });

  // Available Centers list
  const [centers, setCenters] = useState(() => loadSavedCenters());

  // Apply theme to HTML root & persist to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('dnd_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Persist selected center
  const handleSelectCenter = (centerKey) => {
    setSelectedCenter(centerKey);
    try {
      localStorage.setItem('dnd_active_center', centerKey);
    } catch {
      // ignore
    }
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Automatic migration: purge legacy Sinhala text stored in browser localStorage
  useEffect(() => {
    try {
      const keys = [
        'ds_furniture_roles_catalog_v2',
        'ds_furniture_role_permissions_v3',
        'ds_furniture_store_settings_v2',
        'dnd_centers_list',
        'dnd_customers_list',
        'dnd_products_list',
      ];
      keys.forEach((k) => {
        const item = localStorage.getItem(k);
        if (item && /[\u0D80-\u0DFF]/.test(item)) {
          if (k === 'ds_furniture_roles_catalog_v2') {
            try {
              const roles = JSON.parse(item);
              const cleaned = roles.map((r) => ({
                ...r,
                name: r.id === 'admin'
                  ? 'Administrator (Super Admin / Owner)'
                  : r.id === 'executive'
                  ? 'Executive Staff (Showroom & Operations)'
                  : (r.name || '').replace(/[\u0D80-\u0DFF]/g, '').trim(),
                name_si: r.id === 'admin'
                  ? 'Super Administrator'
                  : r.id === 'executive'
                  ? 'Executive Staff'
                  : (r.name_si || '').replace(/[\u0D80-\u0DFF]/g, '').trim() || r.shortLabel || 'Custom Role',
                description: (r.description || '').replace(/[\u0D80-\u0DFF]/g, '').trim(),
              }));
              localStorage.setItem(k, JSON.stringify(cleaned));
            } catch {
              localStorage.removeItem(k);
            }
          } else {
            const sanitized = item.replace(/[\u0D80-\u0DFF]/g, '');
            localStorage.setItem(k, sanitized);
          }
        }
      });
    } catch {
      // ignore
    }
  }, []);

  // Sync centers & active user from localStorage if updated elsewhere
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e || e.key === 'dnd_centers_list') {
        setCenters(loadSavedCenters());
      }
      if (!e || e.key === 'ds_furniture_active_user_id') {
        setCurrentUser(getActiveUser());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Live badge counts
  const badges = {
    lowStock: 2,
    outstanding: 1,
  };

  const getPageInfo = () => {
    switch (activeTab) {
      // Main
      case 'dashboard':
        return {
          title: 'Executive Dashboard',
          subtitle: "Today's cash in hand, workshop inventory health, and active customer orders",
        };
      // Orders & Billing
      case 'orders':
        return {
          title: 'Orders & Invoices',
          subtitle: 'Manage furniture orders, advances, balances due, and printable bills',
        };
      case 'payments':
        return {
          title: 'Payments & Advances',
          subtitle: 'Log and track customer advance payments, installments, and balance settlements',
        };
      case 'returns':
        return {
          title: 'Returns & Repairs',
          subtitle: 'Manage damaged items, customer repairs, or replacement orders',
        };
      // Inventory
      case 'products':
        return {
          title: 'Products Catalog',
          subtitle: 'Manage Wood, Melamine, and Electrical items, prices, and stock',
        };
      case 'categories':
        return {
          title: 'Product Categories',
          subtitle: 'Manage Wood, Melamine, and Electrical Items categories',
        };
      case 'stock':
        return {
          title: 'Stock Management',
          subtitle: 'Track physical warehouse inventory, adjustments, and movement history',
        };
      case 'low-stock':
        return {
          title: 'Low Stock Alerts',
          subtitle: 'Items falling below reorder threshold needing immediate carpentry work',
        };
      // Customers
      case 'customers':
        return {
          title: 'Customer Directory',
          subtitle: 'Client contacts, delivery addresses, and full order history',
        };
      case 'outstanding':
        return {
          title: 'Outstanding Balances',
          subtitle: 'Track pending customer credit, delivery balances, and due dates',
        };
      // Centers
      case 'centers':
        return {
          title: 'Center Directory',
          subtitle: 'Manage regional distribution centers, center codes, and field branch officers',
        };
      case 'create-center':
        return {
          title: 'Create New Center',
          subtitle: 'Register new regional centers and branch codes for customer identification',
        };
      // Purchasing
      case 'suppliers':
        return {
          title: 'Timber & Material Suppliers',
          subtitle: 'Timber depots, hardware suppliers, and vendor ledger',
        };
      case 'purchases':
        return {
          title: 'Stock Purchases & Inward Goods',
          subtitle: 'Raw timber planks, varnish, fabric, and hardware purchases',
        };
      // Finance & Cash
      case 'cashbook':
        return {
          title: 'Daily Cash Book',
          subtitle: 'Record day-to-day cash in and out to ensure zero cash loss',
        };
      case 'expenses':
        return {
          title: 'Workshop & Store Expenses',
          subtitle: 'Rent, timber costs, carpenter labor wages, transport, and petty cash',
        };
      case 'day-close':
        return {
          title: 'Day-End Cash Balancing',
          subtitle: 'Reconcile drawer cash with daily transaction records before closing',
        };
      // Reports
      case 'reports-sales':
        return {
          title: 'Sales & Revenue Reports',
          subtitle: 'Analyze daily, weekly, and monthly furniture sales turnover',
        };
      case 'reports-profit':
        return {
          title: 'Profit & Margins Report',
          subtitle: 'Estimated gross profit factoring manufacturing and raw material costs',
        };
      // Administration
      case 'settings':
        return {
          title: 'Store Settings & Invoice Configurations',
          subtitle: 'Business legal details, 10-year Teak warranty statement, and deposit bank accounts',
        };
      case 'users':
        return {
          title: 'Users & Roles Management',
          subtitle: 'Staff credentials, role permissions matrix, and page access control',
        };
      case 'backup':
        return {
          title: 'Data Backup & Export Facility',
          subtitle: 'One-click full system JSON backup downloads, CSV table exports, and safe restore',
        };
      default:
        return {
          title: 'D&S Furniture',
          subtitle: 'Modern Woodcraft Management Portal',
        };
    }
  };

  const pageInfo = getPageInfo();

  // Check if current user is allowed to access the activeTab
  // Crucial: Dashboard and Users & Roles configuration panel are ALWAYS allowed
  const isPageAllowed =
    activeTab === 'users' ||
    activeTab === 'dashboard' ||
    hasPageAccess(currentUser, activeTab);

  const renderGenericPlaceholder = (title, description) => (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">{title}</h3>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
        {description}
      </p>
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          background: 'var(--ash-50)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: '10px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem',
          color: 'var(--primary)',
        }}
      >
        <span>🛠️ This module is ready for step-by-step feature implementation.</span>
      </div>
    </div>
  );

  // Render Access Denied Screen when a restricted page is opened
  const renderAccessRestricted = () => {
    const roleMeta = ROLES_METADATA[currentUser?.role];
    return (
      <div
        className="panel"
        style={{
          padding: '48px 32px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          maxWidth: '680px',
          margin: '40px auto',
          borderRadius: '16px',
          border: '1.5px solid var(--border-subtle)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem', color: 'var(--text-main)' }}>
            Access Restricted
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Administrator authorization is required to access the <strong>{pageInfo.title}</strong> module.
          </span>
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderRadius: '10px',
            background: 'var(--ash-50)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.85rem',
            color: 'var(--text-main)',
            maxWidth: '520px',
            lineHeight: '1.6',
          }}
        >
          Your active persona is currently logged in as: <br />
          <strong>{currentUser?.name}</strong> (
          <span style={{ color: roleMeta?.color || 'var(--primary)', fontWeight: 700 }}>
            {roleMeta?.label}
          </span>
          ).<br />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            This role does not have operational permissions assigned for this page.
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
            onClick={() => setActiveTab('dashboard')}
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #7E22CE 0%, #9333EA 100%)',
              borderColor: '#9333EA',
              color: '#FFFFFF',
              fontWeight: 600,
            }}
            onClick={() => handleSwitchRole('admin')}
          >
            <Crown size={16} />
            <span>Switch to Administrator</span>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
            onClick={() => setActiveTab('users')}
          >
            <Lock size={16} />
            <span>Open Users & Roles</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        badges={badges}
        currentUser={currentUser}
      />

      <div className={`main-wrapper ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          selectedCenter={selectedCenter}
          onSelectCenter={handleSelectCenter}
          centers={centers}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          currentUser={currentUser}
          onSwitchRole={handleSwitchRole}
        />

        <main className="content-area">
          {/* Access Control Enforcement: If page is restricted for current role, block and show friendly notification */}
          {!isPageAllowed ? (
            renderAccessRestricted()
          ) : (
            <>
              {/* Main */}
              {activeTab === 'dashboard' && (
                <DashboardPage
                  selectedCenter={selectedCenter}
                  centers={centers}
                  onNavigate={setActiveTab}
                />
              )}

              {/* Orders & Billing */}
              {activeTab === 'orders' && <OrdersPage />}
              {activeTab === 'payments' &&
                renderGenericPlaceholder(
                  'Payments & Customer Advances',
                  'Log and inspect customer advance payments, cash receipts, and bank deposit slips.'
                )}
              {activeTab === 'returns' &&
                renderGenericPlaceholder(
                  'Returns & Repair Handling',
                  'Record defective furniture returns, wood polish repairs, and replacements.'
                )}

              {/* Inventory */}
              {activeTab === 'products' && <ProductsPage />}
              {activeTab === 'categories' &&
                renderGenericPlaceholder(
                  'Product Categories Directory',
                  'Organize products into Wood, Melamine, and Electrical Items lines.'
                )}
              {activeTab === 'stock' && <ProductsPage initialStockFilter="all" />}
              {activeTab === 'low-stock' && <ProductsPage initialStockFilter="low_stock" />}

              {/* Customers */}
              {activeTab === 'customers' && (
                <CustomersPage
                  initialDebtFilter="all"
                  selectedCenter={selectedCenter}
                />
              )}
              {activeTab === 'outstanding' && (
                <CustomersPage
                  initialDebtFilter="debt"
                  selectedCenter={selectedCenter}
                />
              )}

              {/* Centers */}
              {(activeTab === 'centers' || activeTab === 'create-center') && (
                <CentersPage
                  key={activeTab}
                  initialOpenCreate={activeTab === 'create-center'}
                  headerCenter={selectedCenter}
                  onNavigate={setActiveTab}
                />
              )}

              {/* Purchasing */}
              {activeTab === 'suppliers' &&
                renderGenericPlaceholder(
                  'Timber & Material Suppliers',
                  'Maintain vendor records for timber mills, paint dealers, and fabric suppliers.'
                )}
              {activeTab === 'purchases' &&
                renderGenericPlaceholder(
                  'Stock Purchases & Inward Goods',
                  'Record timber cubic feet, plywood sheets, and hardware bought into workshop.'
                )}

              {/* Finance */}
              {activeTab === 'cashbook' && <CashHandlingPage />}
              {activeTab === 'expenses' && <CashHandlingPage />}
              {activeTab === 'day-close' && <CashHandlingPage />}

              {/* Reports */}
              {activeTab === 'reports-sales' &&
                renderGenericPlaceholder(
                  'Sales Turnover & Volume Reports',
                  'Generate sales turnover summaries by date range, payment mode, and furniture line.'
                )}
              {activeTab === 'reports-profit' &&
                renderGenericPlaceholder(
                  'Gross Profit & Cost Analysis',
                  'Compare selling prices against timber and labor cost to verify profit margins.'
                )}

              {/* Administration */}
              {activeTab === 'settings' && <SettingsPage />}
              {activeTab === 'users' && (
                <UsersPage
                  currentRole={currentUser?.role || 'admin'}
                  onRoleChange={(newRole) => {
                    setActiveRole(newRole);
                    setCurrentUser(getActiveUser());
                  }}
                  currentUser={currentUser}
                  onUserChange={setCurrentUser}
                />
              )}
              {activeTab === 'backup' && <BackupPage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
