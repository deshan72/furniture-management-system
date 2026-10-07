import React from 'react';
import {
  LayoutDashboard,
  Armchair,
  Users,
  ShoppingCart,
  WalletCards,
  FileText,
  Boxes,
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Stock', icon: Armchair },
    { id: 'customers', label: 'Customers & Credit', icon: Users },
    { id: 'orders', label: 'Orders & Invoices', icon: ShoppingCart },
    { id: 'cashbook', label: 'Cash Handling', icon: WalletCards },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-icon-box">
          <Boxes size={24} />
        </div>
        <div>
          <h2 className="brand-title">D & D FURNITURE</h2>
          <span className="brand-subtitle">Management Portal</span>
        </div>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '2px' }}>D & D Furniture Works</p>
        <p>Admin Portal v1.0.0</p>
      </div>
    </aside>
  );
}
