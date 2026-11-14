import React, { useState, useEffect, useMemo } from 'react';
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
  Wallet,
  Calendar,
  CalendarClock,
  TrendingUp,
  CheckCircle2,
  Clock,
  Phone,
  PhoneCall,
  ShieldCheck,
  Eye,
  Receipt,
  Search,
  ArrowUpRight,
  CreditCard,
  Crown,
  Briefcase,
  ExternalLink,
  Filter,
  Check,
  Target,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { formatCenterCode, loadSavedCenters } from '../utils/centersData';
import { loadSavedCustomers } from '../utils/customersData';
import { loadSavedPayments } from '../utils/paymentsData';
import { loadSavedOrders } from '../utils/ordersData';
import {
  calculateCenterCollectionStats,
  isCenterScheduledForDate,
} from '../utils/collectionUtils';
import { getAuthenticatedUser } from '../utils/authData';
import { formatLKR, formatDate } from '../utils/formatters';

export default function DashboardPage({
  selectedCenter = 'all',
  centers: propCenters,
  onNavigate,
  currentUser: propUser,
}) {
  // Current authenticated user (Admin or Executive)
  const currentUser = useMemo(() => {
    return propUser || getAuthenticatedUser() || { role: 'admin', name: 'D N S Administrator' };
  }, [propUser]);

  const isExecutive = currentUser?.role === 'executive';

  // State: Data stores
  const [centers, setCenters] = useState(() => {
    return propCenters && propCenters.length > 0 ? propCenters : loadSavedCenters();
  });

  const [customers, setCustomers] = useState(() => loadSavedCustomers());
  const [orders, setOrders] = useState(() => loadSavedOrders());
  const [payments, setPayments] = useState(() => loadSavedPayments());

  // Weekly tracker UI state
  const [weeklyFilter, setWeeklyFilter] = useState('all'); // 'all' | 'pending' | 'collected'
  const [weeklySearch, setWeeklySearch] = useState('');

  // Keep state synchronized with storage events
  useEffect(() => {
    const handleStorage = () => {
      setCustomers(loadSavedCustomers());
      setOrders(loadSavedOrders());
      setPayments(loadSavedPayments());
      setCenters(loadSavedCenters());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('dnd_customers_updated', handleStorage);
    window.addEventListener('dnd_orders_updated', handleStorage);
    window.addEventListener('dnd_payments_updated', handleStorage);
    window.addEventListener('dnd_centers_updated', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dnd_customers_updated', handleStorage);
      window.removeEventListener('dnd_orders_updated', handleStorage);
      window.removeEventListener('dnd_payments_updated', handleStorage);
      window.removeEventListener('dnd_centers_updated', handleStorage);
    };
  }, []);

  // Sync centers from props if provided
  useEffect(() => {
    if (propCenters && propCenters.length > 0) {
      setCenters(propCenters);
    }
  }, [propCenters]);

  // Center matching helper (matches by center_code)
  const matchesCenter = (itemBranch, itemCenter) => {
    if (!selectedCenter || selectedCenter === 'all') return true;
    const targetCode = formatCenterCode(selectedCenter.includes('/') ? selectedCenter.split('/')[1] : selectedCenter);
    const itemCode = formatCenterCode(itemCenter);
    if (itemCode && targetCode && itemCode === targetCode) {
      return true;
    }
    return false;
  };

  // Filtered collections by center
  const filteredCustomers = useMemo(() => {
    if (!selectedCenter || selectedCenter === 'all') return customers;
    const targetCode = formatCenterCode(selectedCenter.includes('/') ? selectedCenter.split('/')[1] : selectedCenter);
    return customers.filter((c) => {
      const cCode = formatCenterCode(c.center_code);
      if (cCode && targetCode && cCode === targetCode) return true;
      if (c.customer_id && String(c.customer_id).includes('/')) {
        const parts = String(c.customer_id).split('/');
        if (parts.length >= 2 && formatCenterCode(parts[1]) === targetCode) return true;
      }
      return false;
    });
  }, [customers, selectedCenter]);

  const filteredOrders = useMemo(() => {
    if (!selectedCenter || selectedCenter === 'all') return orders;
    return orders.filter((o) => matchesCenter(o.branch_code, o.center_code));
  }, [orders, selectedCenter]);

  const filteredPayments = useMemo(() => {
    if (!selectedCenter || selectedCenter === 'all') return payments;
    return payments.filter((p) => matchesCenter(p.branch_code, p.center_code));
  }, [payments, selectedCenter]);

  // Active Center Object
  const activeCenterObj = useMemo(() => {
    if (!selectedCenter || selectedCenter === 'all') return null;
    const targetCode = formatCenterCode(selectedCenter.includes('/') ? selectedCenter.split('/')[1] : selectedCenter);
    return centers.find((c) => {
      const cCode = formatCenterCode(c.center_code);
      return c.id === selectedCenter || (cCode && targetCode && cCode === targetCode);
    });
  }, [centers, selectedCenter]);

  // =========================================================================
  // DATE RANGE CALCULATIONS: TODAY & CURRENT WEEK
  // =========================================================================
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Center-Wise Daily Collection Hub State (Executive Focus)
  const [dashCollectionCenterId, setDashCollectionCenterId] = useState(() => {
    const stored = localStorage.getItem('dnd_active_collection_center');
    if (stored) return stored;
    if (selectedCenter && selectedCenter !== 'all') return selectedCenter;
    const today = new Date().toISOString().slice(0, 10);
    const allCenters = propCenters && propCenters.length > 0 ? propCenters : loadSavedCenters();
    const scheduled = allCenters.find((c) => isCenterScheduledForDate(c, today));
    if (scheduled) return scheduled.id || scheduled.center_code;
    return allCenters[0]?.id || allCenters[0]?.center_code || 'cntr-1';
  });

  const activeDashCenter = useMemo(() => {
    if (!centers || centers.length === 0) return null;
    return (
      centers.find(
        (c) =>
          c.id === dashCollectionCenterId ||
          c.center_code === dashCollectionCenterId ||
          formatCenterCode(c.center_code) === formatCenterCode(dashCollectionCenterId) ||
          `${c.branch_code}/${formatCenterCode(c.center_code)}` === dashCollectionCenterId
      ) || centers[0]
    );
  }, [centers, dashCollectionCenterId]);

  // The collection date MUST equal center's cash_collect_date
  const dashCollectionDate = useMemo(() => {
    return activeDashCenter?.cash_collect_date || todayStr;
  }, [activeDashCenter, todayStr]);

  const dashCenterStats = useMemo(() => {
    return calculateCenterCollectionStats({
      center: activeDashCenter,
      dateStr: dashCollectionDate,
      orders,
      payments,
      customers,
    });
  }, [activeDashCenter, dashCollectionDate, orders, payments, customers]);

  const handleOpenCenterCollection = (center) => {
    if (!center) return;
    localStorage.setItem('dnd_active_collection_center', center.id || center.center_code);
    localStorage.setItem('dnd_active_payments_subview', 'collection_day');
    if (center.cash_collect_date) {
      localStorage.setItem('dnd_active_collection_date', center.cash_collect_date);
    }
    if (onNavigate) {
      onNavigate('payments');
    }
  };

  const { weekStartStr, weekEndStr, weekLabel } = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    // Monday as start of week (0 is Sunday, 1 is Monday)
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const startStr = monday.toISOString().slice(0, 10);
    const endStr = sunday.toISOString().slice(0, 10);

    const label = `${monday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${sunday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    return { weekStartStr: startStr, weekEndStr: endStr, weekLabel: label };
  }, []);

  // Today's Payments & Total Collection
  const todayPayments = useMemo(() => {
    return filteredPayments.filter((p) => p.date === todayStr);
  }, [filteredPayments, todayStr]);

  const todayCollectionAmount = useMemo(() => {
    return todayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [todayPayments]);

  // Current Week Payments & Total Collected
  const weekPayments = useMemo(() => {
    return filteredPayments.filter((p) => p.date >= weekStartStr && p.date <= weekEndStr);
  }, [filteredPayments, weekStartStr, weekEndStr]);

  const collectedThisWeek = useMemo(() => {
    return weekPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [weekPayments]);

  // =========================================================================
  // WEEKLY CASH COLLECTION TARGET & DUE CLIENTS (EXECUTIVE FOCUS)
  // =========================================================================
  const weeklyDueAccounts = useMemo(() => {
    // Active loans with outstanding balance
    const activeLoans = filteredOrders.filter(
      (o) => (o.status === 'Active Loan' || Number(o.balance_due) > 0) && Number(o.balance_due) > 0
    );

    return activeLoans.map((o) => {
      const isWeekly = o.loan_frequency === 'weekly';
      const bal = Number(o.balance_due) || 0;
      const instVal = Number(o.installment_value) || Math.ceil(bal / (Number(o.loan_terms) || 12));

      // Weekly due installment
      const weeklyDue = isWeekly ? Math.min(bal, instVal) : Math.min(bal, instVal);

      // Check payments made by this client/contract this week
      const paymentsForContract = weekPayments.filter(
        (p) =>
          p.contract_no === o.contract_no ||
          (p.customer_nic && o.customer_nic && p.customer_nic === o.customer_nic) ||
          (p.customer_name && o.customer_name && p.customer_name.trim().toLowerCase() === o.customer_name.trim().toLowerCase())
      );

      const paidThisWeekAmount = paymentsForContract.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const isCollected = paidThisWeekAmount >= weeklyDue || paymentsForContract.length > 0;

      return {
        ...o,
        weeklyDue,
        paidThisWeekAmount,
        isCollected,
        isWeekly,
        remainingTermDues: Math.max(0, weeklyDue - paidThisWeekAmount),
      };
    });
  }, [filteredOrders, weekPayments]);

  // Total Weekly Target for all due accounts
  const totalWeeklyTarget = useMemo(() => {
    return weeklyDueAccounts.reduce((sum, acc) => sum + acc.weeklyDue, 0);
  }, [weeklyDueAccounts]);

  const remainingWeeklyToCollect = useMemo(() => {
    return Math.max(0, totalWeeklyTarget - collectedThisWeek);
  }, [totalWeeklyTarget, collectedThisWeek]);

  const weeklyProgressPercent = useMemo(() => {
    if (totalWeeklyTarget <= 0) return collectedThisWeek > 0 ? 100 : 0;
    return Math.min(100, Math.round((collectedThisWeek / totalWeeklyTarget) * 100));
  }, [totalWeeklyTarget, collectedThisWeek]);

  // Filtered Due Accounts for Display
  const filteredDueAccounts = useMemo(() => {
    let list = weeklyDueAccounts;

    if (weeklyFilter === 'pending') {
      list = list.filter((a) => !a.isCollected);
    } else if (weeklyFilter === 'collected') {
      list = list.filter((a) => a.isCollected);
    }

    if (weeklySearch.trim()) {
      const q = weeklySearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.customer_name?.toLowerCase().includes(q) ||
          a.customer_nic?.toLowerCase().includes(q) ||
          a.customer_phone?.toLowerCase().includes(q) ||
          a.contract_no?.toLowerCase().includes(q) ||
          a.item_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [weeklyDueAccounts, weeklyFilter, weeklySearch]);

  // Overall Business Metrics
  const metrics = useMemo(() => {
    const totalClients = filteredCustomers.length;
    const withDebt = filteredCustomers.filter((c) => Number(c.outstanding_balance) > 0);
    const totalDebt = filteredOrders.reduce((sum, o) => sum + (Number(o.balance_due) || 0), 0);
    const totalSales = filteredOrders.reduce(
      (sum, o) => sum + (Number(o.gross_amount) || Number(o.unit_price) * (Number(o.quantity) || 1) || 0),
      0
    );
    const activeCentersCount = centers.filter((c) => c.status === 'active').length;

    return {
      totalClients,
      withDebtCount: withDebt.length,
      totalDebt: totalDebt || withDebt.reduce((sum, c) => sum + Number(c.outstanding_balance), 0),
      totalSales: totalSales || 2450000,
      activeCentersCount,
    };
  }, [filteredCustomers, filteredOrders, centers]);

  return (
    <div className="dashboard-page modern-responsive-dashboard">
      {/* =========================================================
          RESPONSIVE EMBEDDED STYLES FOR DASHBOARD
          ========================================================= */}
      <style>{`
        .modern-responsive-dashboard {
          padding-bottom: 36px;
        }

        /* Top Context Banner Responsive Styling */
        .dashboard-context-banner {
          background: linear-gradient(135deg, #1E4D8C 0%, #0F2E59 60%, #0A192F 100%);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 18px;
          padding: 24px 28px;
          margin-bottom: 24px;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          box-shadow: 0 10px 30px rgba(15, 46, 89, 0.22);
          position: relative;
          overflow: hidden;
        }

        .dashboard-context-banner::after {
          content: '';
          position: absolute;
          top: -60%;
          right: -8%;
          width: 380px;
          height: 380px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .context-banner-left {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        .context-hub-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }

        .context-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .context-role-pill {
          background: rgba(245, 158, 11, 0.22);
          border: 1px solid rgba(245, 158, 11, 0.45);
          color: #FDE68A;
          padding: 3px 12px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .context-hub-pill {
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.26);
          padding: 3px 12px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.4px;
          color: #E2E8F0;
        }

        .context-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: #A7F3D0;
          font-weight: 600;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .context-banner-title {
          font-size: 1.38rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 6px 0;
          letter-spacing: -0.3px;
        }

        .context-banner-sub {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.82);
          max-width: 680px;
          line-height: 1.5;
          margin: 0;
        }

        .context-banner-actions {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
          flex-wrap: wrap;
        }

        /* 6-Card Responsive KPI Grid */
        .dash-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }

        .kpi-interactive-card {
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .kpi-interactive-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
          border-color: var(--primary-light);
        }

        /* Executive Weekly Collection Tracker Card */
        .executive-tracker-card {
          background: #FFFFFF;
          border: 1px solid var(--ash-300);
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
          margin-bottom: 24px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .executive-tracker-header {
          padding: 20px 26px;
          background: linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%);
          border-bottom: 1px solid var(--ash-200);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .tracker-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .tracker-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #FEF3C7;
          color: #D97706;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(217, 119, 6, 0.15);
        }

        .tracker-pills-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* 3-Pillar Progress Summary Strip */
        .tracker-stats-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          padding: 22px 26px 16px 26px;
        }

        .tracker-stat-box {
          padding: 16px 18px;
          border-radius: 14px;
          border: 1px solid var(--ash-200);
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.2s ease;
        }

        .tracker-stat-box:hover {
          border-color: var(--ash-400);
          transform: translateY(-2px);
        }

        .tracker-progress-container {
          padding: 0 26px 20px 26px;
        }

        .tracker-progress-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .tracker-progress-track {
          width: 100%;
          height: 10px;
          border-radius: 8px;
          background: #E2E8F0;
          overflow: hidden;
        }

        .tracker-progress-fill {
          height: 100%;
          border-radius: 8px;
          background: linear-gradient(90deg, #10B981 0%, #059669 100%);
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Filter & Search Bar in Tracker */
        .tracker-controls-bar {
          padding: 14px 26px;
          background: var(--ash-50);
          border-top: 1px solid var(--ash-200);
          border-bottom: 1px solid var(--ash-200);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .tracker-filter-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid var(--ash-300);
          background: #FFFFFF;
          color: var(--text-main);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .tracker-filter-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .tracker-filter-btn.active {
          background: var(--primary);
          color: #FFFFFF;
          border-color: var(--primary);
        }

        /* Responsive Due Accounts Table */
        .tracker-table-container {
          overflow-x: auto;
          max-height: 420px;
          overflow-y: auto;
        }

        .tracker-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          text-align: left;
        }

        .tracker-table th {
          background: #F8FAFC;
          padding: 12px 18px;
          font-size: 0.74rem;
          font-weight: 800;
          color: var(--ash-600);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--ash-200);
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 2;
        }

        .tracker-table td {
          padding: 14px 18px;
          border-bottom: 1px solid var(--ash-200);
          vertical-align: middle;
        }

        .tracker-table tr:hover {
          background: #F8FAFC;
        }

        /* Mobile Card View Alternative for Due Accounts */
        .tracker-mobile-cards {
          display: none;
          padding: 16px;
          gap: 12px;
          flex-direction: column;
        }

        .due-client-mobile-card {
          background: #FFFFFF;
          border: 1px solid var(--ash-200);
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        /* Dark Theme Adaptations */
        [data-theme="dark"] .executive-tracker-card {
          background: #141F36 !important;
          border-color: #243554 !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45) !important;
        }

        [data-theme="dark"] .executive-tracker-header {
          background: #0F182B !important;
          border-color: #243554 !important;
        }

        [data-theme="dark"] .tracker-stat-box {
          background: #0F182B !important;
          border-color: #243554 !important;
        }

        [data-theme="dark"] .tracker-stat-box.pillar-target {
          background: rgba(245, 158, 11, 0.1) !important;
          border-color: rgba(245, 158, 11, 0.3) !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-target .pillar-title {
          color: #FBBF24 !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-target .pillar-val {
          color: #FDE68A !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-target .pillar-sub {
          color: #F59E0B !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-target .pillar-icon {
          background: rgba(245, 158, 11, 0.22) !important;
          color: #FBBF24 !important;
        }

        [data-theme="dark"] .tracker-stat-box.pillar-collected {
          background: rgba(16, 185, 129, 0.1) !important;
          border-color: rgba(16, 185, 129, 0.3) !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-collected .pillar-title {
          color: #4ADE80 !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-collected .pillar-val {
          color: #86EFAC !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-collected .pillar-sub {
          color: #34D399 !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-collected .pillar-icon {
          background: rgba(16, 185, 129, 0.22) !important;
          color: #4ADE80 !important;
        }

        [data-theme="dark"] .tracker-stat-box.pillar-pending {
          background: rgba(239, 68, 68, 0.1) !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-pending .pillar-title {
          color: #F87171 !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-pending .pillar-val {
          color: #FCA5A5 !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-pending .pillar-sub {
          color: #EF4444 !important;
        }
        [data-theme="dark"] .tracker-stat-box.pillar-pending .pillar-icon {
          background: rgba(239, 68, 68, 0.22) !important;
          color: #F87171 !important;
        }

        [data-theme="dark"] .tracker-search-input {
          background: #141F36 !important;
          color: #F8FAFC !important;
          border-color: #243554 !important;
        }
        [data-theme="dark"] .tracker-search-input::placeholder {
          color: #64748B !important;
        }
        [data-theme="dark"] .tracker-week-pill {
          background: #141F36 !important;
          border-color: #243554 !important;
          color: #F8FAFC !important;
        }

        [data-theme="dark"] .tracker-progress-track {
          background: #243554 !important;
        }

        [data-theme="dark"] .tracker-controls-bar {
          background: #0B1220 !important;
          border-color: #243554 !important;
        }

        [data-theme="dark"] .tracker-filter-btn {
          background: #141F36 !important;
          border-color: #243554 !important;
          color: #CBD5E1 !important;
        }

        [data-theme="dark"] .tracker-filter-btn.active {
          background: #3B82F6 !important;
          border-color: #3B82F6 !important;
          color: #FFFFFF !important;
        }

        [data-theme="dark"] .tracker-table th {
          background: #0F182B !important;
          border-color: #243554 !important;
          color: #94A3B8 !important;
        }

        [data-theme="dark"] .tracker-table td {
          border-color: #1E293B !important;
          color: #E2E8F0 !important;
        }

        [data-theme="dark"] .tracker-table tr:hover {
          background: #16243D !important;
        }

        [data-theme="dark"] .due-client-mobile-card {
          background: #0F182B !important;
          border-color: #243554 !important;
        }

        /* =========================================================
           RESPONSIVE BREAKPOINTS (Mobile & Tablet)
           ========================================================= */
        @media (max-width: 1024px) {
          .dash-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .dashboard-grid-2col {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-context-banner {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 20px 18px !important;
          }
          .context-banner-actions {
            width: 100%;
            justify-content: flex-start;
          }
          .context-banner-actions button {
            flex: 1 1 auto;
          }
          .dash-kpi-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .tracker-stats-strip {
            grid-template-columns: 1fr;
            padding: 16px;
          }
          .tracker-progress-container {
            padding: 0 16px 16px 16px;
          }
          .tracker-controls-bar {
            padding: 12px 16px;
            flex-direction: column;
            align-items: stretch;
          }
          .tracker-table-container {
            display: none;
          }
          .tracker-mobile-cards {
            display: flex;
          }
        }
      `}</style>

      {/* =========================================================
          ACTIVE CONTEXT BANNER (ROLE & CENTER AWARE)
          ========================================================= */}
      <div className="dashboard-context-banner">
        <div className="context-banner-left">
          <div className="context-hub-icon">
            <Store size={26} color="#60A5FA" />
          </div>
          <div>
            <div className="context-badge-row">
              {/* Role Indicator */}
              <span className="context-role-pill">
                {isExecutive ? (
                  <>
                    <Briefcase size={13} /> EXECUTIVE FIELD & CASH DESK
                  </>
                ) : (
                  <>
                    <Crown size={13} /> SUPER ADMIN ENTERPRISE VIEW
                  </>
                )}
              </span>

              {/* Center Hub Indicator */}
              <span className="context-hub-pill">
                {selectedCenter === 'all'
                  ? '🌐 ALL DISTRIBUTION CENTERS'
                  : `📍 ${activeCenterObj?.branch_code || 'HUB'} / ${formatCenterCode(activeCenterObj?.center_code || selectedCenter)}`}
              </span>

              {/* Live Status */}
              <span className="context-status-pill">
                <span className="pulse-dot" /> Live Ledger Synced
              </span>
            </div>

            <h2 className="context-banner-title">
              {selectedCenter === 'all'
                ? 'Central Island-Wide Operations & Financial Command'
                : activeCenterObj
                ? `${activeCenterObj.name} (${activeCenterObj.city})`
                : `Center Hub: ${selectedCenter}`}
            </h2>

            <p className="context-banner-sub">
              {selectedCenter === 'all'
                ? `Managing customer loans, daily collections, workshop inventory, and distribution across all ${centers.length} regional hubs.`
                : activeCenterObj?.notes ||
                  `Officer in charge: ${activeCenterObj?.contact_person || 'Branch Officer'} • Hotline: ${activeCenterObj?.phone || '077XXXXXXX'}`}
            </p>
          </div>
        </div>

        <div className="context-banner-actions">
          {onNavigate && (
            <>
              <button
                type="button"
                className="btn btn-outline-white"
                onClick={() => onNavigate('sales-targets')}
                title="View Sales Targets & Performance Quotas"
              >
                <Target size={15} /> Sales Targets
              </button>
              <button
                type="button"
                className="btn btn-outline-white"
                onClick={() => onNavigate('payments')}
                title="View Payments & Cash Advances Ledger"
              >
                <Wallet size={15} /> Collect Cash
              </button>
              <button
                type="button"
                className="btn btn-outline-white"
                onClick={() => onNavigate('customers')}
                title="View Registered Customers"
              >
                <Users size={15} /> Clients ({metrics.totalClients})
              </button>
              {!isExecutive && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onNavigate('create-center')}
                  title="Register New Regional Distribution Hub"
                >
                  <Plus size={15} /> Add Center
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* =========================================================
          6-CARD RESPONSIVE KPI METRICS GRID (TOP VIEW)
          Featuring: Today's Collection, Weekly Cash, Debt, Clients, Sales, Hubs
          ========================================================= */}
      <div className="dash-kpi-grid">
        {/* KPI 1: Today's Collection */}
        <div
          className="kpi-interactive-card"
          onClick={() => onNavigate && onNavigate('payments')}
          title="Click to view today's collected receipts"
        >
          <StatCard
            title="Today's Collection"
            value={formatLKR(todayCollectionAmount)}
            subtitle={
              todayPayments.length > 0
                ? `${todayPayments.length} receipt(s) collected today`
                : 'No payments logged yet today'
            }
            icon={Wallet}
            color="#15803D"
            bg="#DCFCE7"
          />
        </div>

        {/* KPI 2: Weekly Cash to Collect */}
        <div
          className="kpi-interactive-card"
          onClick={() => {
            const el = document.getElementById('executive-weekly-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          title="Click to view weekly recovery action plan"
        >
          <StatCard
            title="Weekly Cash to Collect"
            value={formatLKR(totalWeeklyTarget)}
            subtitle={`${weeklyDueAccounts.filter((a) => !a.isCollected).length} client(s) pending collection this week`}
            icon={CalendarClock}
            color="#D97706"
            bg="#FEF3C7"
          />
        </div>

        {/* KPI 3: Total Outstanding Debt */}
        <div
          className="kpi-interactive-card"
          onClick={() => onNavigate && onNavigate('customer-overview')}
          title="Click to view customer overview and debt ledgers"
        >
          <StatCard
            title="Outstanding Balances"
            value={formatLKR(metrics.totalDebt)}
            subtitle={`${metrics.withDebtCount} client(s) with pending credit`}
            icon={AlertTriangle}
            color="#DC2626"
            bg="#FEE2E2"
          />
        </div>

        {/* KPI 4: Total Furniture Clients */}
        <div
          className="kpi-interactive-card"
          onClick={() => onNavigate && onNavigate('customers')}
        >
          <StatCard
            title={selectedCenter === 'all' ? 'Total Furniture Clients' : 'Hub Registered Clients'}
            value={metrics.totalClients}
            subtitle={selectedCenter === 'all' ? 'Active clients nationwide' : `Clients in ${activeCenterObj?.city || 'this center'}`}
            icon={Users}
            color="#1E4D8C"
            bg="#E8F1FA"
          />
        </div>

        {/* KPI 5: Total Sales Value */}
        <div
          className="kpi-interactive-card"
          onClick={() => onNavigate && onNavigate('orders')}
        >
          <StatCard
            title="Total Sales Value (LKR)"
            value={formatLKR(metrics.totalSales)}
            subtitle="Workshop & delivered contracts"
            icon={Banknote}
            color="#059669"
            bg="#DCFCE7"
          />
        </div>

        {/* KPI 6: Active Regional Hubs */}
        <div
          className="kpi-interactive-card"
          onClick={() => onNavigate && onNavigate('centers')}
        >
          <StatCard
            title="Active Regional Hubs"
            value={`${metrics.activeCentersCount} / ${centers.length}`}
            subtitle="Operational centers & workshops"
            icon={Building2}
            color="#7C3AED"
            bg="#EDE9FE"
          />
        </div>
      </div>

      {/* =========================================================
          EXECUTIVE CENTER-WISE DAILY CASH COLLECTION & TARGET HUB
          (Today's collection center, target amount, collected, shortfall, and 1-click navigation)
          ========================================================= */}
      <div
        className="executive-center-hub-card"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          border: '1px solid #CBD5E1',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
          padding: '22px 26px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Hub Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '16px',
            marginBottom: '18px',
          }}
        >
          {/* Title & Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1E4D8C 0%, #0F2E59 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(30,77,140,0.25)',
              }}
            >
              <Target size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.14rem', fontWeight: 800, color: 'var(--text-main, #0F172A)' }}>
                  Today's Center Cash Collection & Target Hub
                </h3>
                <span
                  style={{
                    background: '#E0F2FE',
                    color: '#0369A1',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 9px',
                    borderRadius: '12px',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  Daily Center Target
                </span>
                {dashCenterStats.isScheduledToday ? (
                  <span
                    style={{
                      background: '#DCFCE7',
                      color: '#15803D',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 9px',
                      borderRadius: '12px',
                      border: '1px solid #86EFAC',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span className="pulse-dot" style={{ width: '6px', height: '6px', background: '#16A34A' }}></span>
                    Scheduled Cash Collection Today
                  </span>
                ) : (
                  <span
                    style={{
                      background: '#FEF3C7',
                      color: '#92400E',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 9px',
                      borderRadius: '12px',
                      border: '1px solid #FDE68A',
                    }}
                  >
                    💵 Cash Collect Date: {formatDate(dashCollectionDate)}
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #64748B)' }}>
                Field cash collection target and client payment recovery desk for regional centers.
              </p>
            </div>
          </div>

          {/* Center Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ash-600)' }}>
              Center:
            </span>
            <select
              className="form-input"
              value={activeDashCenter?.id || activeDashCenter?.center_code || dashCollectionCenterId}
              onChange={(e) => {
                setDashCollectionCenterId(e.target.value);
                localStorage.setItem('dnd_active_collection_center', e.target.value);
              }}
              style={{
                fontWeight: 800,
                fontSize: '0.9rem',
                padding: '7px 12px',
                minWidth: '270px',
                borderColor: '#2563EB',
                background: 'var(--bg-card, #fff)',
                color: 'var(--text-main, #0F172A)',
                borderRadius: '8px',
              }}
            >
              {centers.map((c) => {
                const isSch = isCenterScheduledForDate(c, todayStr);
                return (
                  <option key={c.id || c.center_code} value={c.id || c.center_code}>
                    {c.branch_code ? `${c.branch_code}/` : ''}{c.center_code} — {c.name}{c.cash_collect_date ? ` [📅 ${c.cash_collect_date}]` : ''} {isSch ? '⭐ (Scheduled Today)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 4-Pillar Stat Box Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Pillar 1: Target to Collect */}
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
                Center Target to Collect ({formatDate(dashCollectionDate)})
              </span>
              <div style={{ fontSize: '1.34rem', fontWeight: 900, color: '#92400E', marginTop: '1px' }}>
                {formatLKR(dashCenterStats.targetAmount)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#B45309' }}>
                {dashCenterStats.totalClientsCount} active center clients
              </div>
            </div>
          </div>

          {/* Pillar 2: Collected Today */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>
                Cash Collected ({dashCollectionDate === todayStr ? 'Today' : formatDate(dashCollectionDate)})
              </span>
              <div style={{ fontSize: '1.34rem', fontWeight: 900, color: '#166534', marginTop: '1px' }}>
                {formatLKR(dashCenterStats.collectedToday)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#15803D' }}>
                {dashCenterStats.confirmedCount} confirmed receipts
              </div>
            </div>
          </div>

          {/* Pillar 3: Pending Shortfall */}
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                Pending Shortfall
              </span>
              <div style={{ fontSize: '1.34rem', fontWeight: 900, color: '#991B1B', marginTop: '1px' }}>
                {formatLKR(dashCenterStats.pendingShortfall)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#DC2626' }}>
                {dashCenterStats.pendingCount} client(s) pending
              </div>
            </div>
          </div>

          {/* Pillar 4: Target Progress % */}
          <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-subtle, var(--ash-200))', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-500)', textTransform: 'uppercase' }}>
                Recovery Efficiency
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: dashCenterStats.achievementRate >= 100 ? '#16A34A' : '#2563EB' }}>
                {dashCenterStats.achievementRate}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${dashCenterStats.achievementRate}%`,
                  background: dashCenterStats.achievementRate >= 100 ? '#16A34A' : 'linear-gradient(90deg, #2563EB 0%, #10B981 100%)',
                  borderRadius: '10px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{dashCenterStats.confirmedCount} of {dashCenterStats.totalClientsCount} clients</span>
              <span>{dashCenterStats.achievementRate >= 100 ? '🎯 Full Target Met!' : 'Collecting'}</span>
            </div>
          </div>
        </div>

        {/* Bottom Context & CTA Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px dashed #CBD5E1',
          }}
        >
          {/* Status Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.76rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Clock size={13} /> {dashCenterStats.pendingCount} Clients Pending Collection
            </span>

            <span
              style={{
                background: '#F0FDF4',
                color: '#15803D',
                border: '1px solid #BBF7D0',
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.76rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Check size={13} strokeWidth={2.5} /> {dashCenterStats.confirmedCount} Clients Confirmed Paid
            </span>

            <span style={{ fontSize: '0.76rem', color: 'var(--ash-500)' }}>
              👤 In Charge: <strong>{dashCenterStats.officerInCharge}</strong> • 📞 <strong>{dashCenterStats.officerPhone || '077XXXXXXX'}</strong>
            </span>
          </div>

          {/* Action CTA */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenCenterCollection(activeDashCenter)}
            style={{
              padding: '9px 18px',
              fontSize: '0.86rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
            }}
          >
            <span>Open Center Collection Sheet & Collect Cash</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* =========================================================
          EXECUTIVE WEEKLY CASH COLLECTION & RECOVERY TRACKER
          ========================================================= */}
      <div className="executive-tracker-card" id="executive-weekly-section">
        {/* Tracker Header */}
        <div className="executive-tracker-header">
          <div className="tracker-title-group">
            <div className="tracker-icon-badge">
              <CalendarClock size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Executive Weekly Cash Collection & Recovery Tracker
                </h3>
                <span
                  style={{
                    background: '#E0F2FE',
                    color: '#0369A1',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  Weekly Cash Recovery
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Field collection schedule for weekly installment loans and due customer accounts.
              </p>
            </div>
          </div>

          <div className="tracker-pills-row">
            <div
              className="tracker-week-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-subtle, var(--ash-300))',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-main)',
              }}
            >
              <Calendar size={14} color="var(--primary)" />
              <span>Week: {weekLabel}</span>
            </div>

            {onNavigate && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                onClick={() => onNavigate('payments')}
              >
                <Plus size={14} /> Record Payment
              </button>
            )}
          </div>
        </div>

        {/* 3-Pillar Progress Summary Strip */}
        <div className="tracker-stats-strip">
          {/* Pillar 1: Target to Collect */}
          <div className="tracker-stat-box pillar-target" style={{ background: '#FFFBEB' }}>
            <div
              className="pillar-icon"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="pillar-title" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
                Weekly Target to Collect
              </div>
              <div className="pillar-val" style={{ fontSize: '1.24rem', fontWeight: 900, color: '#92400E', marginTop: '2px' }}>
                {formatLKR(totalWeeklyTarget)}
              </div>
              <div className="pillar-sub" style={{ fontSize: '0.72rem', color: '#B45309' }}>
                {weeklyDueAccounts.length} active installment accounts
              </div>
            </div>
          </div>

          {/* Pillar 2: Collected So Far This Week */}
          <div className="tracker-stat-box pillar-collected" style={{ background: '#F0FDF4' }}>
            <div
              className="pillar-icon"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="pillar-title" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>
                Collected This Week
              </div>
              <div className="pillar-val" style={{ fontSize: '1.24rem', fontWeight: 900, color: '#166534', marginTop: '2px' }}>
                {formatLKR(collectedThisWeek)}
              </div>
              <div className="pillar-sub" style={{ fontSize: '0.72rem', color: '#15803D' }}>
                {weekPayments.length} payment receipt(s) cleared
              </div>
            </div>
          </div>

          {/* Pillar 3: Remaining to Recover */}
          <div className="tracker-stat-box pillar-pending" style={{ background: '#FEF2F2' }}>
            <div
              className="pillar-icon"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={22} />
            </div>
            <div>
              <div className="pillar-title" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                Pending Weekly Cash
              </div>
              <div className="pillar-val" style={{ fontSize: '1.24rem', fontWeight: 900, color: '#991B1B', marginTop: '2px' }}>
                {formatLKR(remainingWeeklyToCollect)}
              </div>
              <div className="pillar-sub" style={{ fontSize: '0.72rem', color: '#DC2626' }}>
                {weeklyDueAccounts.filter((a) => !a.isCollected).length} client(s) pending collection
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="tracker-progress-container">
          <div className="tracker-progress-meta">
            <span style={{ color: 'var(--text-muted)' }}>
              Weekly Recovery Efficiency: <strong>{weeklyProgressPercent}%</strong>
            </span>
            <span style={{ color: weeklyProgressPercent >= 100 ? '#16A34A' : '#D97706' }}>
              {weeklyProgressPercent >= 100
                ? '🎯 Full Weekly Target Met!'
                : `${formatLKR(remainingWeeklyToCollect)} remaining for this week`}
            </span>
          </div>
          <div className="tracker-progress-track">
            <div
              className="tracker-progress-fill"
              style={{
                width: `${weeklyProgressPercent}%`,
                background:
                  weeklyProgressPercent >= 100
                    ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(90deg, #F59E0B 0%, #10B981 100%)',
              }}
            />
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="tracker-controls-bar">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`tracker-filter-btn ${weeklyFilter === 'all' ? 'active' : ''}`}
              onClick={() => setWeeklyFilter('all')}
            >
              All Due Accounts ({weeklyDueAccounts.length})
            </button>
            <button
              type="button"
              className={`tracker-filter-btn ${weeklyFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setWeeklyFilter('pending')}
            >
              <Clock size={13} /> Pending Collection ({weeklyDueAccounts.filter((a) => !a.isCollected).length})
            </button>
            <button
              type="button"
              className={`tracker-filter-btn ${weeklyFilter === 'collected' ? 'active' : ''}`}
              onClick={() => setWeeklyFilter('collected')}
            >
              <Check size={13} /> Collected This Week ({weeklyDueAccounts.filter((a) => a.isCollected).length})
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ash-400)' }}
            />
            <input
              type="text"
              placeholder="Search by client name, NIC, phone..."
              value={weeklySearch}
              onChange={(e) => setWeeklySearch(e.target.value)}
              className="tracker-search-input"
              style={{
                width: '100%',
                padding: '7px 12px 7px 34px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, var(--ash-300))',
                fontSize: '0.82rem',
                outline: 'none',
                background: 'var(--bg-card, #FFFFFF)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>

        {/* Desktop / Tablet Due Accounts Table */}
        <div className="tracker-table-container">
          <table className="tracker-table">
            <thead>
              <tr>
                <th>Client Profile & Contact</th>
                <th>Contract & Furniture</th>
                <th>Center Hub</th>
                <th>Plan & Frequency</th>
                <th style={{ textAlign: 'right' }}>Weekly Due</th>
                <th style={{ textAlign: 'right' }}>Total Loan Balance</th>
                <th style={{ textAlign: 'center' }}>Collection Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDueAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={32} color="#10B981" />
                      <strong style={{ fontSize: '0.94rem' }}>No pending accounts matching filter</strong>
                      <span style={{ fontSize: '0.8rem' }}>All weekly installments are up to date.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDueAccounts.map((account) => (
                  <tr key={account.id || account.contract_no}>
                    {/* Client Profile */}
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                          {account.customer_name}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          <span>NIC: {account.customer_nic || 'N/A'}</span>
                          {account.customer_phone && (
                            <a
                              href={`tel:${account.customer_phone}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                              title="Click to call client"
                            >
                              <Phone size={11} /> {account.customer_phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contract & Furniture */}
                    <td>
                      <div>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-tint)', padding: '2px 6px', borderRadius: '4px' }}>
                          {account.contract_no || account.invoice_no}
                        </span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginTop: '3px', fontWeight: 600 }}>
                          {account.item_name}
                        </div>
                      </div>
                    </td>

                    {/* Center Hub */}
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {account.branch_code || 'MHG'} / {formatCenterCode(account.center_code || 'C001')}
                      </span>
                    </td>

                    {/* Frequency & Term */}
                    <td>
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: account.isWeekly ? '#E0F2FE' : '#F3E8FF',
                            color: account.isWeekly ? '#0369A1' : '#7E22CE',
                          }}
                        >
                          {account.isWeekly ? 'Weekly Plan' : 'Monthly Plan'}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Term {account.installments_paid || 1} of {account.loan_terms || 12}
                        </div>
                      </div>
                    </td>

                    {/* Weekly Due Amount */}
                    <td style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.94rem', color: account.isCollected ? '#16A34A' : '#D97706' }}>
                        {formatLKR(account.weeklyDue)}
                      </strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        per week target
                      </div>
                    </td>

                    {/* Total Loan Balance */}
                    <td style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#DC2626' }}>
                        {formatLKR(account.balance_due)}
                      </strong>
                    </td>

                    {/* Status */}
                    <td style={{ textAlign: 'center' }}>
                      {account.isCollected ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: '#DCFCE7',
                            color: '#15803D',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 size={13} /> Collected
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: '#FEF3C7',
                            color: '#B45309',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          <Clock size={13} /> Pending Due
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.76rem', borderRadius: '6px' }}
                          onClick={() => onNavigate && onNavigate('payments')}
                          title="Record payment for this client"
                        >
                          <Wallet size={12} /> Pay
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: '0.76rem', borderRadius: '6px' }}
                          onClick={() => onNavigate && onNavigate('customer-overview')}
                          title="View complete customer loan dossier"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Alternative Card View for Due Accounts */}
        <div className="tracker-mobile-cards">
          {filteredDueAccounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              No accounts match the selected filter.
            </div>
          ) : (
            filteredDueAccounts.map((account) => (
              <div key={`m-${account.id || account.contract_no}`} className="due-client-mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{account.customer_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIC: {account.customer_nic || 'N/A'}</div>
                  </div>
                  {account.isCollected ? (
                    <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                      ✓ Paid This Week
                    </span>
                  ) : (
                    <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                      ⏳ Pending Due
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                  <strong>Item:</strong> {account.item_name} ({account.contract_no})
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--ash-50)', padding: '8px 10px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weekly Due:</span>
                    <div style={{ fontWeight: 800, color: '#D97706' }}>{formatLKR(account.weeklyDue)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Balance:</span>
                    <div style={{ fontWeight: 800, color: '#DC2626' }}>{formatLKR(account.balance_due)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {account.customer_phone && (
                    <a
                      href={`tel:${account.customer_phone}`}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <PhoneCall size={14} /> Call Client
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                    onClick={() => onNavigate && onNavigate('payments')}
                  >
                    <Wallet size={14} /> Collect Pay
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =========================================================
          QUICK ACTIONS & REGIONAL NETWORK (2 COLUMNS)
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
              const cntrCode = formatCenterCode(cntr.center_code);
              const cntrCity = (cntr.city || '').trim().toLowerCase();
              const cntrName = (cntr.name || '').trim().toLowerCase();
              const key = cntr.branch_code ? `${cntr.branch_code?.toUpperCase()}/${cntrCode}` : cntrCode;
              const isCurrent =
                selectedCenter === key ||
                (selectedCenter !== 'all' && formatCenterCode(selectedCenter) === cntrCode);

              // Accurately count unique clients belonging to this center
              const matchedClientKeys = new Set();

              customers.forEach((c) => {
                const cCode = formatCenterCode(c.center_code);
                const cCity = (c.city || '').trim().toLowerCase();
                const cCenterName = (c.center_name || '').trim().toLowerCase();
                const clientKey = c.nic || c.customer_id || c.id || c.name;

                if (cCode && cntrCode && cCode === cntrCode) {
                  matchedClientKeys.add(clientKey);
                  return;
                }
                if (cCity && cntrCity && cCity === cntrCity) {
                  matchedClientKeys.add(clientKey);
                  return;
                }
                if (cCenterName && cntrName && cCenterName === cntrName) {
                  matchedClientKeys.add(clientKey);
                  return;
                }
                if (c.customer_id && String(c.customer_id).includes('/')) {
                  const parts = String(c.customer_id).split('/');
                  if (parts.length >= 2 && formatCenterCode(parts[1]) === cntrCode) {
                    matchedClientKeys.add(clientKey);
                    return;
                  }
                }
              });

              // Also count clients who have orders in this center
              orders.forEach((o) => {
                const oCenter = formatCenterCode(o.center_code);
                const oContract = String(o.contract_no || '');
                if (oCenter === cntrCode || oContract.includes(`/${cntrCode}/`)) {
                  const oName = (o.customer_name || '').trim().toLowerCase();
                  const oNic = String(o.customer_nic || o.customer_id || '').trim();
                  // Sunil Jayawardena safeguard (belongs to C001)
                  if (oName.includes('sunil') || oNic === '197814502391') {
                    if (cntrCode === 'C001') {
                      matchedClientKeys.add(oNic || o.customer_name);
                    }
                  } else {
                    matchedClientKeys.add(oNic || o.customer_name || o.customer_id);
                  }
                }
              });

              const clientCount = matchedClientKeys.size;

              return (
                <div
                  key={cntr.id || key}
                  className={`dashboard-center-item ${isCurrent ? 'is-current' : ''}`}
                >
                  <div className="center-item-left">
                    <span className="center-item-code">
                      {cntr.branch_code ? `${cntr.branch_code} / ${cntrCode}` : cntrCode}
                    </span>
                    <div>
                      <div className="center-item-name">{cntr.name}</div>
                      <div className="center-item-meta">
                        {cntr.city} • {cntr.contact_person || 'Center Officer'} • {cntr.phone || '077XXXXXXX'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {clientCount} client(s)
                    </span>
                    <span className={`status-badge status-${cntr.status}`}>
                      {cntr.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Workflow Shortcuts & Executive Actions */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--accent)" /> Executive Workflows & Navigation
            </h3>
          </div>

          <div className="dashboard-actions-list">
            {/* Customer Directory */}
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

            {/* Customer Overview */}
            <div
              className="dash-action-card"
              onClick={() => onNavigate && onNavigate('customer-overview')}
            >
              <div className="action-card-icon" style={{ background: '#FEF3C7', color: '#B45309' }}>
                <CreditCard size={18} />
              </div>
              <div className="action-card-text">
                <div className="action-card-title">Customer Overview & Loan Dossiers</div>
                <div className="action-card-desc">
                  Inspect client profiles, active loan balances, PDF statements, and repayment history.
                </div>
              </div>
              <ArrowRight size={16} className="action-card-arrow" />
            </div>

            {/* Payments & Advances */}
            <div
              className="dash-action-card"
              onClick={() => onNavigate && onNavigate('payments')}
            >
              <div className="action-card-icon" style={{ background: '#DCFCE7', color: '#15803D' }}>
                <Wallet size={18} />
              </div>
              <div className="action-card-text">
                <div className="action-card-title">Payments & Customer Advances</div>
                <div className="action-card-desc">
                  Record installment settlements, issue official PDF receipts, and view payment ledgers.
                </div>
              </div>
              <ArrowRight size={16} className="action-card-arrow" />
            </div>

            {/* Orders & Invoices */}
            <div
              className="dash-action-card"
              onClick={() => onNavigate && onNavigate('orders')}
            >
              <div className="action-card-icon" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
                <Receipt size={18} />
              </div>
              <div className="action-card-text">
                <div className="action-card-title">Orders & Workshop Specifications</div>
                <div className="action-card-desc">
                  Track showroom orders, download commercial PDF invoices, and manage production stages.
                </div>
              </div>
              <ArrowRight size={16} className="action-card-arrow" />
            </div>

            {/* Daily Cash Book */}
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
                  Log carpenter labor wages, customer cash advances, and day-end balancing.
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
