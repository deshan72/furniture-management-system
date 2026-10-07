import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import OrdersPage from './pages/OrdersPage';
import CashHandlingPage from './pages/CashHandlingPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

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
          subtitle: 'Manage damaged items, customer repairs, or replacement orders (Phase 2)',
        };
      // Inventory
      case 'products':
        return {
          title: 'Products Catalog',
          subtitle: 'Add/edit wooden furniture, wood types, prices, and dimensions',
        };
      case 'categories':
        return {
          title: 'Furniture Categories',
          subtitle: 'Manage Living Room, Bedroom, Dining, Office, and Custom categories',
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
          title: 'Outstanding Balances (ණය / හිඟ මුදල්)',
          subtitle: 'Track pending customer credit, delivery balances, and due dates',
        };
      // Purchasing
      case 'suppliers':
        return {
          title: 'Timber & Material Suppliers',
          subtitle: 'Timber depots, hardware suppliers, and vendor ledger (Phase 2)',
        };
      case 'purchases':
        return {
          title: 'Stock Purchases & Inward Goods',
          subtitle: 'Raw timber planks, varnish, fabric, and hardware purchases (Phase 2)',
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
          title: 'Store Settings & Branding',
          subtitle: 'Business name, invoice header details, phone numbers, and defaults',
        };
      case 'users':
        return {
          title: 'Users & Roles Management',
          subtitle: 'Owner, cashier, and workshop staff access privileges (Phase 2)',
        };
      case 'backup':
        return {
          title: 'Data Backup & Export',
          subtitle: 'Export tables to Excel / CSV or backup Supabase records (Phase 2)',
        };
      default:
        return {
          title: 'D & D Furniture',
          subtitle: 'Modern Woodcraft Management Portal',
        };
    }
  };

  const pageInfo = getPageInfo();

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
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: '10px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem',
          color: 'var(--accent-gold)',
        }}
      >
        <span>🛠️ This module is ready for step-by-step feature implementation.</span>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        badges={badges}
      />

      <div className={`main-wrapper ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
        />

        <main className="content-area">
          {/* Main */}
          {activeTab === 'dashboard' && <DashboardPage />}

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
              'Furniture Categories Directory',
              'Organize products into Living Room, Bedroom, Dining, Office, and Custom lines.'
            )}
          {activeTab === 'stock' && <ProductsPage />}
          {activeTab === 'low-stock' &&
            renderGenericPlaceholder(
              'Low Stock Reorder Alerts',
              'Review furniture items that have 2 or fewer units in the showroom or workshop.'
            )}

          {/* Customers */}
          {activeTab === 'customers' && <CustomersPage />}
          {activeTab === 'outstanding' && <CustomersPage />}

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
          {activeTab === 'settings' &&
            renderGenericPlaceholder(
              'Store Profile & Invoice Configurations',
              'Configure showroom contact numbers, invoice header text, workshop address, and currencies.'
            )}
          {activeTab === 'users' &&
            renderGenericPlaceholder(
              'User Roles & Permissions',
              'Manage access for store owners, sales staff, and inventory managers.'
            )}
          {activeTab === 'backup' &&
            renderGenericPlaceholder(
              'Data Backup & Export Facility',
              'One-click download of all sales records, inventory tables, and customer contacts.'
            )}
        </main>
      </div>
    </div>
  );
}
