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

  const getPageInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Executive Dashboard',
          subtitle: 'Real-time overview of cash flow, active bookings, and workshop inventory',
        };
      case 'products':
        return {
          title: 'Products & Stock Management',
          subtitle: 'Manage handcrafted furniture items, wood types, pricing, and stock levels',
        };
      case 'customers':
        return {
          title: 'Customer Directory & Credit',
          subtitle: 'Maintain client contacts, addresses, purchase history, and outstanding balances',
        };
      case 'orders':
        return {
          title: 'Orders & Invoices',
          subtitle: 'Track ready-made sales, custom made-to-order projects, advances, and bills',
        };
      case 'cashbook':
        return {
          title: 'Day-to-Day Cash Handling',
          subtitle: 'Daily cash book ledger, workshop expenses, labor wages, and day-end balancing',
        };
      default:
        return { title: 'D & D Furniture', subtitle: 'Management System' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main-wrapper">
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
        />

        <main className="content-area">
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'products' && <ProductsPage />}
          {activeTab === 'customers' && <CustomersPage />}
          {activeTab === 'orders' && <OrdersPage />}
          {activeTab === 'cashbook' && <CashHandlingPage />}
        </main>
      </div>
    </div>
  );
}
