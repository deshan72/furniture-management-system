import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Users,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  Filter,
  DollarSign,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Eye,
  FileText,
  X,
} from 'lucide-react';
import Modal from '../components/Modal';
import {
  loadSavedTargets,
  saveTargetsToStorage,
  calculateTargetProgress,
} from '../utils/salesTargetsData';
import { loadSavedOrders } from '../utils/ordersData';
import { loadSavedCustomers } from '../utils/customersData';
import { loadSavedCenters, formatCenterCode } from '../utils/centersData';
import { loadSavedAccounts, getAuthenticatedUser } from '../utils/authData';
import { formatLKR, formatDate } from '../utils/formatters';
import { addLiveNotification } from '../utils/notificationsData';

export default function SalesTargetsPage({ currentUser: propUser, onNavigate }) {
  // Current user state (Admin vs Executive)
  const currentUser = useMemo(() => {
    return propUser || getAuthenticatedUser() || { role: 'admin', name: 'D N S Administrator' };
  }, [propUser]);

  const isAdmin = currentUser?.role === 'admin';

  // Data Stores
  const [targets, setTargets] = useState(() => loadSavedTargets());
  const [orders, setOrders] = useState(() => loadSavedOrders());
  const [customers, setCustomers] = useState(() => loadSavedCustomers());
  const [centers, setCenters] = useState(() => loadSavedCenters());
  const [accounts, setAccounts] = useState(() => loadSavedAccounts());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [executiveFilter, setExecutiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'achieved' | 'expired'
  const [periodFilter, setPeriodFilter] = useState('all');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState(null); // null = Create, string = Edit
  const [viewingOrdersTarget, setViewingOrdersTarget] = useState(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formTargetClients, setFormTargetClients] = useState('5');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPeriod, setFormPeriod] = useState('monthly');
  const [formAssignedUserId, setFormAssignedUserId] = useState('');
  const [formCenterCode, setFormCenterCode] = useState('all');
  const [formNotes, setFormNotes] = useState('');

  // Keep state synchronized with storage events
  useEffect(() => {
    const handleSync = () => {
      setTargets(loadSavedTargets());
      setOrders(loadSavedOrders());
      setCustomers(loadSavedCustomers());
      setCenters(loadSavedCenters());
      setAccounts(loadSavedAccounts());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('dns_sales_targets_updated', handleSync);
    window.addEventListener('dnd_orders_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('dns_sales_targets_updated', handleSync);
      window.removeEventListener('dnd_orders_updated', handleSync);
    };
  }, []);

  // Filter available executives from registered accounts
  const executiveAccounts = useMemo(() => {
    return accounts.filter((a) => a.role === 'executive' || a.role === 'staff' || a.role === 'admin');
  }, [accounts]);

  // Enriched targets with live progress calculation
  const enrichedTargets = useMemo(() => {
    return targets.map((t) => {
      const progress = calculateTargetProgress(t, orders, customers);
      return {
        ...t,
        progress,
      };
    });
  }, [targets, orders, customers]);

  // Filtered Targets for display
  const displayedTargets = useMemo(() => {
    return enrichedTargets.filter((t) => {
      // If logged in as executive (and not super admin), by default executive only sees their assigned targets
      if (!isAdmin && t.assigned_to_user_id !== currentUser?.id && t.assigned_to_name !== currentUser?.name) {
        // Still allow viewing if unassigned or general
        if (t.assigned_to_user_id) return false;
      }

      // Executive filter
      if (executiveFilter !== 'all') {
        if (t.assigned_to_user_id !== executiveFilter && t.assigned_to_name !== executiveFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'achieved' && !t.progress.isAchieved) return false;
      if (statusFilter === 'active' && (t.progress.isAchieved || t.progress.isExpired)) return false;
      if (statusFilter === 'expired' && !t.progress.isExpired) return false;

      // Period filter
      if (periodFilter !== 'all' && t.target_period !== periodFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (t.title || '').toLowerCase().includes(q);
        const matchesExec = (t.assigned_to_name || '').toLowerCase().includes(q);
        const matchesCenter = (t.center_code || '').toLowerCase().includes(q);
        const matchesNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesExec && !matchesCenter && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedTargets, isAdmin, currentUser, executiveFilter, statusFilter, periodFilter, searchQuery]);

  // Top KPI Metrics
  const metrics = useMemo(() => {
    const list = displayedTargets;
    const totalTargetVal = list.reduce((sum, t) => sum + (Number(t.target_amount) || 0), 0);
    const totalAchievedVal = list.reduce((sum, t) => sum + (t.progress.achievedAmount || 0), 0);
    const totalClientsTarget = list.reduce((sum, t) => sum + (Number(t.target_clients_count) || 0), 0);
    const totalClientsAchieved = list.reduce((sum, t) => sum + (t.progress.achievedClientsCount || 0), 0);
    const achievedCount = list.filter((t) => t.progress.isAchieved).length;
    const activeCount = list.filter((t) => !t.progress.isAchieved && !t.progress.isExpired).length;
    const overallRate = totalTargetVal > 0 ? Math.round((totalAchievedVal / totalTargetVal) * 100) : 0;

    return {
      totalTargetVal,
      totalAchievedVal,
      totalClientsTarget,
      totalClientsAchieved,
      achievedCount,
      activeCount,
      overallRate,
    };
  }, [displayedTargets]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (!isAdmin) {
      alert('Only administrators have clearance to create and assign new sales targets.');
      return;
    }

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    const firstExec = executiveAccounts.find((a) => a.role === 'executive') || executiveAccounts[0];

    setEditingTargetId(null);
    setFormTitle(`Sales Target — ${today.toLocaleString('en-US', { month: 'long' })} ${today.getFullYear()}`);
    setFormTargetAmount(500000);
    setFormTargetClients(8);
    setFormStartDate(firstDay);
    setFormEndDate(lastDay);
    setFormPeriod('monthly');
    setFormAssignedUserId(firstExec?.id || '');
    setFormCenterCode('all');
    setFormNotes('Target focus: Custom solid teak wardrobes, dining sets, and living room furniture.');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (target) => {
    if (!isAdmin) {
      alert('Only administrators have clearance to edit sales targets.');
      return;
    }

    setEditingTargetId(target.id);
    setFormTitle(target.title || '');
    setFormTargetAmount(target.target_amount || '');
    setFormTargetClients(target.target_clients_count || '5');
    setFormStartDate(target.start_date || '');
    setFormEndDate(target.end_date || '');
    setFormPeriod(target.target_period || 'monthly');
    setFormAssignedUserId(target.assigned_to_user_id || '');
    setFormCenterCode(target.center_code || 'all');
    setFormNotes(target.notes || '');
    setIsFormModalOpen(true);
  };

  // Save Target (Create or Update)
  const handleSaveTarget = (e) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      alert('Please provide a title for the sales target.');
      return;
    }

    const targetVal = Number(formTargetAmount);
    if (!targetVal || targetVal <= 0) {
      alert('Please enter a valid sales target amount in LKR.');
      return;
    }

    const clientCount = Number(formTargetClients);
    if (!clientCount || clientCount <= 0) {
      alert('Target clients count must be at least 1.');
      return;
    }

    if (!formStartDate || !formEndDate) {
      alert('Please select both Start Date and End Date for this target.');
      return;
    }

    if (formStartDate > formEndDate) {
      alert('Start Date cannot be after End Date.');
      return;
    }

    // Resolve assigned executive details
    const assignedUser = accounts.find((a) => a.id === formAssignedUserId) || {
      id: formAssignedUserId || 'usr_exec_001',
      name: 'Executive Staff',
      role: 'executive',
    };

    if (editingTargetId) {
      // Update existing
      const updatedList = targets.map((t) => {
        if (t.id === editingTargetId) {
          return {
            ...t,
            title: formTitle.trim(),
            target_amount: targetVal,
            target_clients_count: clientCount,
            start_date: formStartDate,
            end_date: formEndDate,
            target_period: formPeriod,
            assigned_to_user_id: assignedUser.id,
            assigned_to_name: assignedUser.name,
            assigned_to_role: assignedUser.role || 'executive',
            center_code: formCenterCode,
            notes: formNotes.trim(),
            updated_at: new Date().toISOString(),
          };
        }
        return t;
      });

      setTargets(updatedList);
      saveTargetsToStorage(updatedList);

      addLiveNotification({
        title: 'Sales Target Updated ✏️',
        desc: `Target "${formTitle}" (Rs. ${formatLKR(targetVal)}) updated by Admin.`,
        category: 'alerts',
        type: 'info',
        targetTab: 'sales-targets',
      });

      alert(`✅ Sales Target "${formTitle}" updated successfully.`);
    } else {
      // Create new
      const newTarget = {
        id: `trg-${Date.now().toString().slice(-4)}`,
        title: formTitle.trim(),
        target_amount: targetVal,
        target_clients_count: clientCount,
        start_date: formStartDate,
        end_date: formEndDate,
        target_period: formPeriod,
        assigned_to_user_id: assignedUser.id,
        assigned_to_name: assignedUser.name,
        assigned_to_role: assignedUser.role || 'executive',
        center_code: formCenterCode,
        status: 'active',
        notes: formNotes.trim(),
        created_by: currentUser?.name || 'Administrator',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedList = [newTarget, ...targets];
      setTargets(updatedList);
      saveTargetsToStorage(updatedList);

      addLiveNotification({
        title: 'New Sales Target Assigned 🎯',
        desc: `New target of ${formatLKR(targetVal)} (${clientCount} clients) assigned to ${assignedUser.name}.`,
        category: 'alerts',
        type: 'info',
        targetTab: 'sales-targets',
      });

      alert(`✅ New Sales Target assigned to ${assignedUser.name} successfully.`);
    }

    setIsFormModalOpen(false);
  };

  // Delete Target (Admin only)
  const handleDeleteTarget = (target) => {
    if (!isAdmin) {
      alert('Only administrators can remove sales targets.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete sales target "${target.title}"?`)) {
      const updatedList = targets.filter((t) => t.id !== target.id);
      setTargets(updatedList);
      saveTargetsToStorage(updatedList);

      addLiveNotification({
        title: 'Sales Target Removed 🗑️',
        desc: `Target "${target.title}" was removed by Administrator.`,
        category: 'alerts',
        type: 'info',
        targetTab: 'sales-targets',
      });
    }
  };

  return (
    <div className="sales-targets-page modern-responsive-dashboard" style={{ paddingBottom: '40px' }}>
      {/* =========================================================
          PAGE HEADER & CONTEXT BANNER
          ========================================================= */}
      <div
        className="dashboard-context-banner"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0369A1 100%)',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#ffffff',
          marginBottom: '22px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <Target size={28} color="#38BDF8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: isAdmin ? 'rgba(168, 85, 247, 0.25)' : 'rgba(56, 189, 248, 0.25)',
                  color: isAdmin ? '#E9D5FF' : '#BAE6FD',
                  border: isAdmin ? '1px solid #C084FC' : '1px solid #7DD3FC',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                }}
              >
                {isAdmin ? '👑 Super Admin Control' : '💼 Executive Target Hub'}
              </span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                Live Performance Engine
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
              Sales Target & Quota Command
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', opacity: 0.85 }}>
              Set, monitor, and assign sales revenue targets, deadlines, and client acquisition quotas for showroom executives.
            </p>
          </div>
        </div>

        {/* Action Button */}
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.88rem',
              padding: '10px 18px',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={handleOpenCreateModal}
          >
            <Plus size={18} />
            <span>Create Sales Target</span>
          </button>
        )}
      </div>

      {/* =========================================================
          TOP KPI METRIC CARDS (Performance Summary)
          ========================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '22px',
        }}
      >
        {/* Total Target Value */}
        <div className="panel" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Total Targets Value
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
                {formatLKR(metrics.totalTargetVal)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                {displayedTargets.length} assigned target(s)
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} />
            </div>
          </div>
        </div>

        {/* Realized Sales Amount */}
        <div className="panel" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Realized Sales (Achieved)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>
                {formatLKR(metrics.totalAchievedVal)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#16A34A', marginTop: '2px', fontWeight: 700 }}>
                {metrics.overallRate}% overall achievement
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        {/* Clients Quota Closed */}
        <div className="panel" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Clients Quota Closed
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
                {metrics.totalClientsAchieved} / {metrics.totalClientsTarget}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                Unique customers served
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* Target Status Counts */}
        <div className="panel" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Targets Status
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#7C3AED', marginTop: '4px' }}>
                {metrics.activeCount} Active • {metrics.achievedCount} Done
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                Monitored by Super Admin
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F3E8FF', color: '#7E22CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          SEARCH & FILTER TOOLBAR
          ========================================================= */}
      <div
        className="panel"
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          flexWrap: 'wrap',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by target title, executive, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', height: '40px' }}
          />
        </div>

        {/* Executive Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} color="#64748B" />
          <select
            className="form-input"
            value={executiveFilter}
            onChange={(e) => setExecutiveFilter(e.target.value)}
            style={{ height: '40px', minWidth: '170px' }}
          >
            <option value="all">All Executives</option>
            {executiveAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.role})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <select
          className="form-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: '40px', minWidth: '140px' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="achieved">Achieved 🎯</option>
          <option value="expired">Expired ⚠️</option>
        </select>

        {/* Period Filter */}
        <select
          className="form-input"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          style={{ height: '40px', minWidth: '130px' }}
        >
          <option value="all">All Periods</option>
          <option value="weekly">Weekly</option>
          <option value="bi-weekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </div>

      {/* =========================================================
          TARGETS CARDS LIST / GRID
          ========================================================= */}
      {displayedTargets.length === 0 ? (
        <div
          className="panel"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
          }}
        >
          <Target size={44} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: 0, color: '#1E293B', fontWeight: 800 }}>No Sales Targets Found</h3>
          <p style={{ margin: '6px 0 16px 0', color: '#64748B', fontSize: '0.86rem' }}>
            {isAdmin
              ? 'No sales targets match your filter. Click "Create Sales Target" above to assign one.'
              : 'You have no assigned sales targets matching this view.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
              style={{ fontWeight: 700 }}
            >
              <Plus size={16} /> Create Target Now
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '20px',
          }}
        >
          {displayedTargets.map((target) => {
            const { progress } = target;
            const isDone = progress.isAchieved;
            const isExpired = progress.isExpired;

            return (
              <div
                key={target.id}
                className="panel"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: isDone ? '2px solid #86EFAC' : isExpired ? '1px solid #FECACA' : '1px solid #CBD5E1',
                  boxShadow: isDone ? '0 4px 16px rgba(34,197,94,0.12)' : '0 4px 12px rgba(0,0,0,0.04)',
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top Header Row */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span
                          style={{
                            background: '#F1F5F9',
                            color: '#475569',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {target.target_period || 'Monthly'}
                        </span>
                        {target.center_code && target.center_code !== 'all' ? (
                          <span
                            style={{
                              background: '#E0F2FE',
                              color: '#0369A1',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            📍 {formatCenterCode(target.center_code)}
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#F8FAFC',
                              color: '#64748B',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            🌐 All Centers
                          </span>
                        )}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#0F172A' }}>
                        {target.title}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    {isDone ? (
                      <span
                        style={{
                          background: '#DCFCE7',
                          color: '#15803D',
                          border: '1px solid #86EFAC',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <CheckCircle2 size={13} /> Achieved
                      </span>
                    ) : isExpired ? (
                      <span
                        style={{
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: '1px solid #FCA5A5',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <AlertCircle size={13} /> Expired
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#E0F2FE',
                          color: '#0369A1',
                          border: '1px solid #BAE6FD',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Clock size={13} /> In Progress
                      </span>
                    )}
                  </div>

                  {/* Assigned Executive Banner */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#2563EB',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                        }}
                      >
                        {target.assigned_to_name ? target.assigned_to_name.charAt(0).toUpperCase() : 'E'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B' }}>
                          {target.assigned_to_name || 'Executive Staff'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                          Assigned Showroom Executive
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#64748B' }}>
                      {progress.daysRemaining >= 0 ? (
                        <span style={{ color: progress.daysRemaining <= 5 ? '#D97706' : '#16A34A', fontWeight: 800 }}>
                          ⏳ {progress.daysRemaining} days remaining
                        </span>
                      ) : (
                        <span style={{ color: '#DC2626', fontWeight: 700 }}>
                          Deadline passed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sales Target Value & Progress Bar */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                        Sales Target Value
                      </span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>
                        {formatLKR(target.target_amount)}
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div
                      style={{
                        height: '10px',
                        background: '#E2E8F0',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, progress.amountPercentage)}%`,
                          background: isDone
                            ? 'linear-gradient(90deg, #16A34A, #22C55E)'
                            : 'linear-gradient(90deg, #2563EB, #38BDF8)',
                          borderRadius: '6px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>

                    {/* Realized Sales Details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px', fontSize: '0.76rem' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800 }}>
                        Closed: {formatLKR(progress.achievedAmount)} ({progress.amountPercentage}%)
                      </span>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>
                        {progress.shortfallAmount > 0 ? `Shortfall: ${formatLKR(progress.shortfallAmount)}` : 'Target Exceeded 🎉'}
                      </span>
                    </div>
                  </div>

                  {/* Clients Quota Box */}
                  <div
                    style={{
                      background: '#F1F5F9',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>
                        Target Clients Count
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                        {progress.achievedClientsCount} / {target.target_clients_count} Clients Closed
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 900,
                          color: progress.clientsPercentage >= 100 ? '#15803D' : '#0284C7',
                        }}
                      >
                        {progress.clientsPercentage}%
                      </span>
                      <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                        {progress.shortfallClients > 0 ? `${progress.shortfallClients} client(s) to go` : 'Goal Reached'}
                      </div>
                    </div>
                  </div>

                  {/* Date Period Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#64748B', marginBottom: '12px' }}>
                    <Calendar size={14} color="#94A3B8" />
                    <span>
                      <strong>Period:</strong> {formatDate(target.start_date)} — {formatDate(target.end_date)}
                    </span>
                  </div>

                  {/* Notes / Strategy Instructions */}
                  {target.notes && (
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: '#475569',
                        background: '#FFFBEB',
                        border: '1px solid #FEF3C7',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        marginBottom: '16px',
                        lineHeight: 1.4,
                      }}
                    >
                      💡 <strong>Strategy:</strong> {target.notes}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div
                  style={{
                    borderTop: '1px solid #E2E8F0',
                    paddingTop: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.78rem',
                      padding: '6px 12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    onClick={() => setViewingOrdersTarget(target)}
                  >
                    <Eye size={13} />
                    <span>View Orders ({progress.matchingOrders.length})</span>
                  </button>

                  {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 10px',
                          color: '#2563EB',
                          borderColor: '#BFDBFE',
                        }}
                        onClick={() => handleOpenEditModal(target)}
                        title="Edit Sales Target"
                      >
                        <Edit3 size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 10px',
                          color: '#DC2626',
                          borderColor: '#FECACA',
                        }}
                        onClick={() => handleDeleteTarget(target)}
                        title="Delete Sales Target"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          CREATE / EDIT SALES TARGET MODAL (ADMIN CONTROL)
          ========================================================= */}
      {isFormModalOpen && (
        <Modal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          title={editingTargetId ? 'Edit Executive Sales Target' : 'Create & Assign Executive Sales Target'}
          size="medium"
        >
          <form onSubmit={handleSaveTarget} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px 14px', fontSize: '0.8rem', color: '#1E40AF', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Super Admin Quota Assignment:</strong> Define the sales target value, customer acquisition target, and deadline date. The assigned executive will see live progress in their account.
              </div>
            </div>

            {/* Target Title */}
            <div>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Sales Target Title *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. November Colombo South Teak Sales Target"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            {/* Assigned Executive Selection */}
            <div>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Assign to Executive *
              </label>
              <select
                className="form-input"
                value={formAssignedUserId}
                onChange={(e) => setFormAssignedUserId(e.target.value)}
                required
              >
                {executiveAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — {acc.email} ({acc.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Amount & Client Count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Sales Target Value (LKR) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 500000"
                    min="1000"
                    step="1000"
                    value={formTargetAmount}
                    onChange={(e) => setFormTargetAmount(e.target.value)}
                    required
                  />
                </div>
                {formTargetAmount > 0 && (
                  <div style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 800, marginTop: '4px' }}>
                    Preview: {formatLKR(formTargetAmount)}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Target Clients Count *
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 8"
                  min="1"
                  max="1000"
                  value={formTargetClients}
                  onChange={(e) => setFormTargetClients(e.target.value)}
                  required
                />
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
                  Number of unique customer orders needed
                </div>
              </div>
            </div>

            {/* Dates: Start Date and End Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Target Due Date (Deadline) *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Period and Center */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Target Period
                </label>
                <select
                  className="form-input"
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Applicable Regional Center
                </label>
                <select
                  className="form-input"
                  value={formCenterCode}
                  onChange={(e) => setFormCenterCode(e.target.value)}
                >
                  <option value="all">All Distribution Centers</option>
                  {centers.map((cntr) => (
                    <option key={cntr.id} value={cntr.center_code}>
                      {formatCenterCode(cntr.center_code)} — {cntr.name} ({cntr.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instructions / Strategy Notes */}
            <div>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Strategy & Operational Instructions
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Specific guidance for the executive, key furniture categories to promote, delivery hubs to prioritize..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsFormModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ fontWeight: 800, padding: '10px 20px' }}
              >
                {editingTargetId ? 'Update Sales Target' : 'Assign Sales Target'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =========================================================
          VIEW MATCHING ORDERS BREAKDOWN MODAL
          ========================================================= */}
      {viewingOrdersTarget && (
        <Modal
          isOpen={Boolean(viewingOrdersTarget)}
          onClose={() => setViewingOrdersTarget(null)}
          title={`Order Realization Breakdown — ${viewingOrdersTarget.title}`}
          size="large"
        >
          <div>
            <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>Assigned To</div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#1E293B' }}>{viewingOrdersTarget.assigned_to_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>Target Value</div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A' }}>{formatLKR(viewingOrdersTarget.target_amount)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>Achieved to Date</div>
                <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#16A34A' }}>{formatLKR(viewingOrdersTarget.progress?.achievedAmount)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>Clients Closed</div>
                <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0284C7' }}>{viewingOrdersTarget.progress?.achievedClientsCount} / {viewingOrdersTarget.target_clients_count}</div>
              </div>
            </div>

            {viewingOrdersTarget.progress?.matchingOrders?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748B' }}>
                <FileText size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 700 }}>No customer orders placed yet during this target period.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>Order & Invoice</th>
                      <th style={{ padding: '10px 12px' }}>Date</th>
                      <th style={{ padding: '10px 12px' }}>Client Details</th>
                      <th style={{ padding: '10px 12px' }}>Furniture Item</th>
                      <th style={{ padding: '10px 12px' }}>Center</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Order Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrdersTarget.progress.matchingOrders.map((ord, idx) => (
                      <tr key={ord.id || idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontWeight: 800, color: '#1E40AF' }}>{ord.invoice_no || ord.contract_no}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748B' }}>
                          {formatDate(ord.date || ord.created_at)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <strong style={{ color: '#0F172A' }}>{ord.customer_name}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{ord.customer_phone || ord.customer_nic}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {ord.item_name || 'Furniture Item'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {formatCenterCode(ord.center_code)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#16A34A' }}>
                          {formatLKR(Number(ord.gross_amount) || Number(ord.unit_price) * (Number(ord.quantity) || 1) || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingOrdersTarget(null)}
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

