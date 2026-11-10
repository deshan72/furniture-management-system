import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  ShoppingBag,
  Banknote,
  AlertTriangle,
  ArrowRight,
  Plus,
  Store,
  Sparkles,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { formatCenterCode } from '../utils/centersData';

export default function DashboardPage({ selectedCenter = 'all', centers = [], onNavigate }) {
  // Read customers from localStorage
  const [customers] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_customers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Filter customers by selected center if active
  const filteredCustomers = useMemo(() => {
    if (!selectedCenter || selectedCenter === 'all') return customers;
    return customers.filter((c) => {
      const parts = String(c.customer_id || '').split('/');
      const bCode = (c.branch_code || (parts.length === 4 ? parts[0] : '')).toUpperCase();
      const cCode = formatCenterCode(c.center_code || (parts.length === 4 ? parts[1] : ''));
      if (selectedCenter.includes('/')) {
        const [selB, selC] = selectedCenter.split('/');
        return bCode === selB.toUpperCase() && cCode === formatCenterCode(selC);
      }
      return cCode === formatCenterCode(selectedCenter);
    });
  }, [customers, selectedCenter]);

  // Find active center details
  const activeCenterObj = useMemo(() => {
    if (!selectedCenter || selectedCenter === 'all') return null;
    return centers.find((c) => {
      const key = `${c.branch_code?.toUpperCase()}/${formatCenterCode(c.center_code)}`;
      return key === selectedCenter || c.id === selectedCenter;
    });
  }, [centers, selectedCenter]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const totalClients = filteredCustomers.length;
    const withDebt = filteredCustomers.filter((c) => Number(c.outstanding_balance) > 0);
    const totalDebt = withDebt.reduce((sum, c) => sum + Number(c.outstanding_balance), 0);
    const totalSpent = filteredCustomers.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0);
    const activeCentersCount = centers.filter((c) => c.status === 'active').length;

    return {
      totalClients,
      withDebtCount: withDebt.length,
      totalDebt,
      totalSpent,
      activeCentersCount,
    };
  }, [filteredCustomers, centers]);

  const formatLKR = (val) => {
    const num = Number(val) || 0;
    return `Rs. ${num.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="dashboard-page">
      {/* =========================================================
          ACTIVE CONTEXT BANNER
          ========================================================= */}
      <div className="dashboard-context-banner">
        <div className="context-banner-left">
          <div className="context-hub-icon">
            <Store size={22} color="var(--primary-light)" />
          </div>
          <div>
            <div className="context-badge-row">
              <span className="context-hub-pill">
                {selectedCenter === 'all'
                  ? '🌐 ALL DISTRIBUTION CENTERS'
                  : `📍 ${activeCenterObj?.branch_code || 'HUB'} / ${formatCenterCode(activeCenterObj?.center_code || selectedCenter)}`}
              </span>
              <span className="context-status-pill">
                <span className="pulse-dot" /> Operational & Synced
              </span>
            </div>
            <h2 className="context-banner-title">
              {selectedCenter === 'all'
                ? 'Central Island-Wide Distribution Network'
                : activeCenterObj
                ? `${activeCenterObj.name} (${activeCenterObj.city})`
                : `Center: ${selectedCenter}`}
            </h2>
            <p className="context-banner-sub">
              {selectedCenter === 'all'
                ? `Monitoring operations across all ${centers.length} regional centers and workshops.`
                : activeCenterObj?.notes ||
                  `Officer in charge: ${activeCenterObj?.contact_person || 'Assigned Branch Officer'} • Phone: ${activeCenterObj?.phone || '077XXXXXXX'}`}
            </p>
          </div>
        </div>

        <div className="context-banner-actions">
          {onNavigate && (
            <>
              <button
                type="button"
                className="btn btn-outline-white"
                onClick={() => onNavigate('customers')}
              >
                <Users size={15} /> View Clients ({metrics.totalClients})
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate('create-center')}
              >
                <Plus size={15} /> Add Center
              </button>
            </>
          )}
        </div>
      </div>

      {/* =========================================================
          KPI STATS SUMMARY CARDS
          ========================================================= */}
      <div className="stats-grid">
        <StatCard
          title={selectedCenter === 'all' ? 'Total Furniture Clients' : 'Hub Registered Clients'}
          value={metrics.totalClients}
          subtitle={selectedCenter === 'all' ? 'Active clients nationwide' : `Clients in ${activeCenterObj?.city || 'this center'}`}
          icon={Users}
          color="#1E4D8C"
          bg="#E8F1FA"
        />

        <StatCard
          title="Outstanding Balances (ණය)"
          value={formatLKR(metrics.totalDebt)}
          subtitle={`${metrics.withDebtCount} client(s) with pending credit`}
          icon={AlertTriangle}
          color="#D97706"
          bg="#FEF3C7"
        />

        <StatCard
          title="Total Sales Value (LKR)"
          value={formatLKR(metrics.totalSpent || 2450000)}
          subtitle="Lifetime furniture deliveries"
          icon={Banknote}
          color="#15803D"
          bg="#DCFCE7"
        />

        <StatCard
          title="Active Regional Hubs"
          value={`${metrics.activeCentersCount} / ${centers.length}`}
          subtitle="Operational centers & workshops"
          icon={Building2}
          color="#7C3AED"
          bg="#EDE9FE"
        />
      </div>

      {/* =========================================================
          QUICK ACTIONS & HIGHLIGHTS
          ========================================================= */}
      <div className="dashboard-grid-2col">
        {/* Left Column: Regional Hubs Quick Roster */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="var(--primary)" /> Regional Distribution Network
            </h3>
            {onNavigate && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                onClick={() => onNavigate('centers')}
              >
                Manage Centers <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="dashboard-centers-list">
            {centers.map((cntr) => {
              const key = `${cntr.branch_code?.toUpperCase()}/${formatCenterCode(cntr.center_code)}`;
              return (
                <div
                  key={cntr.id || key}
                  className={`dashboard-center-item ${selectedCenter === key ? 'is-current' : ''}`}
                >
                  <div className="center-item-left">
                    <span className="center-item-code">
                      {cntr.branch_code} / {formatCenterCode(cntr.center_code)}
                    </span>
                    <div>
                      <div className="center-item-name">{cntr.name}</div>
                      <div className="center-item-meta">{cntr.city} • {cntr.contact_person || 'Center Officer'}</div>
                    </div>
                  </div>
                  <span className={`status-badge status-${cntr.status}`}>
                    {cntr.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Workflow Shortcuts & Guidelines */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--accent)" /> System Navigation & Fast Workflow
            </h3>
          </div>

          <div className="dashboard-actions-list">
            <div
              className="dash-action-card"
              onClick={() => onNavigate && onNavigate('customers')}
            >
              <div className="action-card-icon" style={{ background: '#E0F2FE', color: '#0369A1' }}>
                <Users size={18} />
              </div>
              <div className="action-card-text">
                <div className="action-card-title">Customer Directory & Ledger</div>
                <div className="action-card-desc">
                  Register new furniture buyers with ID format <code>BRANCH/CENTER/CONTRACT/ITEM</code>
                </div>
              </div>
              <ArrowRight size={16} className="action-card-arrow" />
            </div>

            <div
              className="dash-action-card"
              onClick={() => onNavigate && onNavigate('create-center')}
            >
              <div className="action-card-icon" style={{ background: '#DCFCE7', color: '#15803D' }}>
                <Building2 size={18} />
              </div>
              <div className="action-card-text">
                <div className="action-card-title">Register New Regional Center</div>
                <div className="action-card-desc">
                  Create new regional distribution center with <code>C001</code> format
                </div>
              </div>
              <ArrowRight size={16} className="action-card-arrow" />
            </div>

            <div
              className="dash-action-card"
              onClick={() => onNavigate && onNavigate('products')}
            >
              <div className="action-card-icon" style={{ background: '#FEF3C7', color: '#B45309' }}>
                <ShoppingBag size={18} />
              </div>
              <div className="action-card-text">
                <div className="action-card-title">Workshop Products & Stock</div>
                <div className="action-card-desc">
                  Manage Teak, Mahogany, Melamine & Electrical inventory items
                </div>
              </div>
              <ArrowRight size={16} className="action-card-arrow" />
            </div>

            <div
              className="dash-action-card"
              onClick={() => onNavigate && onNavigate('cashbook')}
            >
              <div className="action-card-icon" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
                <Banknote size={18} />
              </div>
              <div className="action-card-text">
                <div className="action-card-title">Daily Cash Book & Expenses</div>
                <div className="action-card-desc">
                  Log carpenter labor wages, customer cash advances, and day-end balancing
                </div>
              </div>
              <ArrowRight size={16} className="action-card-arrow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
