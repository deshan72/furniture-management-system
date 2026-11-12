import React, { useState, useMemo, useEffect } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  Printer,
  Trash2,
  CheckCircle,
  X,
  Wrench,
  AlertTriangle,
  Clock,
  User,
  LayoutGrid,
  List,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import Modal from '../components/Modal';
import {
  loadSavedRepairs,
  saveRepairsToStorage,
  generateNextTicketNo,
  REPAIR_CATEGORIES,
  REPAIR_STATUSES,
  WORKSHOP_TECHNICIANS,
} from '../utils/repairsData';
import {
  loadSavedOrders,
} from '../utils/ordersData';
import { formatLKR, formatDate } from '../utils/formatters';

export default function ReturnsRepairsPage({ selectedCenter = 'all', onNavigate }) {
  // Master Data State
  const [repairs, setRepairs] = useState(() => loadSavedRepairs());
  const [orders, setOrders] = useState(() => loadSavedOrders());

  // Search, Status, and View Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'in_repair' | 'ready' | 'completed'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Modals State
  const [isLogTicketModalOpen, setIsLogTicketModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isJobCardModalOpen, setIsJobCardModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  // Form State for Logging New Ticket
  const [formContractSearch, setFormContractSearch] = useState('');
  const [isContractDropdownOpen, setIsContractDropdownOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [formCategory, setFormCategory] = useState(REPAIR_CATEGORIES[0]);
  const [formPriority, setFormPriority] = useState('Medium'); // 'Low' | 'Medium' | 'High' | 'Urgent'
  const [formActionType, setFormActionType] = useState('Workshop Repair'); // 'Workshop Repair' | 'On-site Carpenter Visit' | 'Item Replacement'
  const [formCostBearer, setFormCostBearer] = useState('Under Warranty');
  const [formEstimatedCost, setFormEstimatedCost] = useState(0);
  const [formAssignedTechnician, setFormAssignedTechnician] = useState(WORKSHOP_TECHNICIANS[0]);
  const [formExpectedCompletion, setFormExpectedCompletion] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [formIssueDescription, setFormIssueDescription] = useState('');
  const [formResolutionNotes, setFormResolutionNotes] = useState('');

  // Sync with localStorage
  useEffect(() => {
    const handleStorage = () => {
      setRepairs(loadSavedRepairs());
      setOrders(loadSavedOrders());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Suggestions for order search in the New Ticket modal
  const orderSuggestions = useMemo(() => {
    const q = formContractSearch.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.contract_no?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_nic?.toLowerCase().includes(q) ||
        o.item_name?.toLowerCase().includes(q) ||
        o.item_code?.toLowerCase().includes(q)
    );
  }, [orders, formContractSearch]);

  // Select an order for the repair ticket
  const handleSelectOrder = (ord) => {
    if (ord) {
      setSelectedOrder(ord);
      setFormContractSearch(`${ord.contract_no} — ${ord.customer_name} (${ord.item_name})`);
    } else {
      setSelectedOrder(null);
      setFormContractSearch('');
    }
    setIsContractDropdownOpen(false);
  };

  // Open Log Ticket Modal
  const handleOpenLogModal = () => {
    setSelectedOrder(null);
    setFormContractSearch('');
    setFormCategory(REPAIR_CATEGORIES[0]);
    setFormPriority('Medium');
    setFormActionType('Workshop Repair');
    setFormCostBearer('Under Warranty');
    setFormEstimatedCost(0);
    setFormAssignedTechnician(WORKSHOP_TECHNICIANS[0]);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setFormExpectedCompletion(d.toISOString().slice(0, 10));
    setFormIssueDescription('');
    setFormResolutionNotes('');
    setIsContractDropdownOpen(false);
    setIsLogTicketModalOpen(true);
  };

  // Submit New Ticket
  const handleSubmitTicket = (andPrint = false) => {
    if (!selectedOrder) {
      alert('Please select an active order / contract code for this repair ticket.');
      return;
    }
    if (!formIssueDescription.trim()) {
      alert('Please enter a description of the defect or required repair.');
      return;
    }

    const ticketNo = generateNextTicketNo(repairs);
    const newTicket = {
      id: `rep-${Date.now().toString().slice(-6)}`,
      ticket_no: ticketNo,
      date_reported: new Date().toISOString().slice(0, 10),
      order_id: selectedOrder.id,
      contract_no: selectedOrder.contract_no,
      customer_id: selectedOrder.customer_id || selectedOrder.customer_nic,
      customer_name: selectedOrder.customer_name,
      customer_phone: selectedOrder.customer_phone,
      customer_nic: selectedOrder.customer_nic || selectedOrder.customer_id,
      branch_code: selectedOrder.branch_code || 'MHG',
      center_code: selectedOrder.center_code || 'C001',
      item_code: selectedOrder.item_code,
      item_name: selectedOrder.item_name,
      category: formCategory,
      priority: formPriority,
      status: 'pending',
      action_type: formActionType,
      estimated_cost: Number(formEstimatedCost) || 0,
      cost_bearer: formCostBearer,
      assigned_technician: formAssignedTechnician,
      expected_completion: formExpectedCompletion,
      issue_description: formIssueDescription,
      resolution_notes: formResolutionNotes,
      created_at: new Date().toISOString(),
    };

    const updated = [newTicket, ...repairs];
    setRepairs(updated);
    saveRepairsToStorage(updated);
    setIsLogTicketModalOpen(false);

    if (andPrint) {
      setActiveTicket(newTicket);
      setIsJobCardModalOpen(true);
    }
  };

  // Quick Status Transition
  const handleUpdateStatus = (ticketId, nextStatus) => {
    const updated = repairs.map((t) => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: nextStatus,
          completed_at: nextStatus === 'completed' || nextStatus === 'replaced' ? new Date().toISOString() : t.completed_at,
        };
      }
      return t;
    });
    setRepairs(updated);
    saveRepairsToStorage(updated);

    if (activeTicket && activeTicket.id === ticketId) {
      setActiveTicket((prev) => ({
        ...prev,
        status: nextStatus,
        completed_at: nextStatus === 'completed' || nextStatus === 'replaced' ? new Date().toISOString() : prev.completed_at,
      }));
    }
  };

  // Delete Ticket
  const handleDeleteTicket = (ticketId, ticketNo) => {
    if (window.confirm(`Are you sure you want to delete repair ticket ${ticketNo}?`)) {
      const updated = repairs.filter((t) => t.id !== ticketId);
      setRepairs(updated);
      saveRepairsToStorage(updated);
      if (activeTicket && activeTicket.id === ticketId) {
        setIsDetailsModalOpen(false);
      }
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRepairs.length === 0) {
      alert('No repair records to export.');
      return;
    }
    const headers = [
      'Ticket No',
      'Date Reported',
      'Contract No',
      'Customer Name',
      'Customer Phone',
      'Furniture Item',
      'Defect Category',
      'Priority',
      'Status',
      'Action Type',
      'Technician',
      'Estimated Cost',
      'Cost Bearer',
      'Expected Date',
      'Issue Description',
    ];
    const rows = filteredRepairs.map((r) => [
      `"${r.ticket_no}"`,
      `"${r.date_reported}"`,
      `"${r.contract_no}"`,
      `"${r.customer_name}"`,
      `"${r.customer_phone || ''}"`,
      `"${r.item_name} (${r.item_code})"`,
      `"${r.category}"`,
      `"${r.priority}"`,
      `"${REPAIR_STATUSES[r.status]?.label || r.status}"`,
      `"${r.action_type}"`,
      `"${r.assigned_technician}"`,
      r.estimated_cost || 0,
      `"${r.cost_bearer}"`,
      `"${r.expected_completion || ''}"`,
      `"${(r.issue_description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `furniture_repairs_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Repairs List
  const filteredRepairs = useMemo(() => {
    return repairs.filter((r) => {
      // 1. Center filter from Header
      if (selectedCenter !== 'all') {
        const centerClean = selectedCenter.replace('/', '').toLowerCase();
        const rCenter = `${r.branch_code}${r.center_code}`.toLowerCase();
        if (rCenter !== centerClean) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTicket = r.ticket_no?.toLowerCase().includes(q);
        const matchContract = r.contract_no?.toLowerCase().includes(q);
        const matchCust = r.customer_name?.toLowerCase().includes(q);
        const matchNic = r.customer_nic?.toLowerCase().includes(q);
        const matchItem = r.item_name?.toLowerCase().includes(q) || r.item_code?.toLowerCase().includes(q);
        const matchTech = r.assigned_technician?.toLowerCase().includes(q);
        return matchTicket || matchContract || matchCust || matchNic || matchItem || matchTech;
      }

      return true;
    });
  }, [repairs, selectedCenter, statusFilter, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const activeWorkshop = repairs.filter((r) => r.status === 'in_repair').length;
    const pendingInspection = repairs.filter((r) => r.status === 'pending').length;
    const readyForHandover = repairs.filter((r) => r.status === 'ready').length;
    const completedCount = repairs.filter((r) => r.status === 'completed' || r.status === 'replaced').length;
    return {
      activeWorkshop,
      pendingInspection,
      readyForHandover,
      completedCount,
      total: repairs.length,
    };
  }, [repairs]);

  return (
    <div style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* =========================================================
          1. HEADER WITH STATS & ACTION BUTTONS
          ========================================================= */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid var(--ash-200)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--ash-900)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RotateCcw size={24} color="var(--primary)" /> Returns & Warranty Repairs
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '0.82rem', color: 'var(--ash-500)' }}>
            <span>Total Tickets: <strong style={{ color: 'var(--ash-900)' }}>{repairs.length}</strong></span>
            <span>•</span>
            <span style={{ color: '#2563EB', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563EB' }}></span>
              In Workshop: <strong>{stats.activeWorkshop}</strong>
            </span>
            <span>•</span>
            <span style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16A34A' }}></span>
              Completed: <strong>{stats.completedCount}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenLogModal}
            style={{
              padding: '10px 22px',
              fontSize: '0.92rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.28)',
            }}
          >
            <Plus size={18} strokeWidth={2.5} /> Log Return / Repair Ticket
          </button>
        </div>
      </div>

      {/* =========================================================
          2. KPI SUMMARY STAT CARDS (4 COLUMNS)
          ========================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        {/* Card 1: Active in Workshop */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>In Workshop Repair</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1D4ED8', marginTop: '1px' }}>
              {stats.activeWorkshop} Pieces
            </div>
          </div>
        </div>

        {/* Card 2: Pending Inspection */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Inspection</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B45309', marginTop: '1px' }}>
              {stats.pendingInspection} Tickets
            </div>
          </div>
        </div>

        {/* Card 3: Ready for Handover */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Ready for Handover</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6D28D9', marginTop: '1px' }}>
              {stats.readyForHandover} Ready
            </div>
          </div>
        </div>

        {/* Card 4: Completed Jobs */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--ash-200)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Completed Jobs</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803D', marginTop: '1px' }}>
              {stats.completedCount} Resolved
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. SEARCH, STATUS TABS & VIEW TOGGLE
          ========================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
            placeholder="Search tickets by ticket no, contract, customer, furniture item, or carpenter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '10px', top: '9px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ash-400)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
            onClick={() => setStatusFilter('all')}
          >
            All ({repairs.length})
          </button>
          <button
            type="button"
            className={`btn ${statusFilter === 'in_repair' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
            onClick={() => setStatusFilter('in_repair')}
          >
            In Workshop ({stats.activeWorkshop})
          </button>
          <button
            type="button"
            className={`btn ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({stats.pendingInspection})
          </button>
          <button
            type="button"
            className={`btn ${statusFilter === 'ready' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
            onClick={() => setStatusFilter('ready')}
          >
            Ready ({stats.readyForHandover})
          </button>
          <button
            type="button"
            className={`btn ${statusFilter === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
            onClick={() => setStatusFilter('completed')}
          >
            Completed ({stats.completedCount})
          </button>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', background: 'var(--ash-100)', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              border: 'none',
              background: viewMode === 'table' ? '#fff' : 'transparent',
              color: viewMode === 'table' ? 'var(--primary)' : 'var(--ash-600)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <List size={14} /> Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            style={{
              border: 'none',
              background: viewMode === 'cards' ? '#fff' : 'transparent',
              color: viewMode === 'cards' ? 'var(--primary)' : 'var(--ash-600)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <LayoutGrid size={14} /> Job Cards
          </button>
        </div>
      </div>

      {/* =========================================================
          4. CONTENT: TABLE OR CARDS VIEW
          ========================================================= */}
      {filteredRepairs.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '12px',
            border: '1px dashed var(--ash-300)',
            color: 'var(--ash-500)',
          }}
        >
          <Wrench size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>No warranty repairs or return tickets found</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--ash-400)', marginTop: '4px' }}>
            Click "+ Log Return / Repair Ticket" above to register a customer repair request.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS / KANBAN-STYLE GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredRepairs.map((r) => {
            const stInfo = REPAIR_STATUSES[r.status] || REPAIR_STATUSES.pending;
            return (
              <div
                key={r.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid var(--ash-200)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  {/* Top Bar: Ticket No & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: '5px', border: '1px solid #BFDBFE' }}>
                      🔧 {r.ticket_no}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: stInfo.bg,
                        color: stInfo.color,
                        border: `1px solid ${stInfo.border}`,
                      }}
                    >
                      {stInfo.label}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--ash-900)' }}>
                    {r.customer_name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                    Contract: <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{r.contract_no}</strong> • 📞 {r.customer_phone}
                  </div>

                  {/* Furniture Item Box */}
                  <div style={{ background: 'var(--ash-50)', padding: '8px 10px', borderRadius: '8px', marginTop: '10px', border: '1px solid var(--ash-200)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--ash-800)' }}>
                      🛋️ {r.item_name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                      <span>Category: <strong>{r.category}</strong></span>
                      <span style={{ color: r.priority === 'Urgent' ? '#DC2626' : r.priority === 'High' ? '#D97706' : 'var(--ash-600)', fontWeight: 700 }}>
                        {r.priority} Priority
                      </span>
                    </div>
                  </div>

                  {/* Issue Description */}
                  <p style={{ fontSize: '0.78rem', color: 'var(--ash-700)', marginTop: '10px', lineHeight: 1.4, background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px dashed var(--ash-200)' }}>
                    "{r.issue_description}"
                  </p>

                  {/* Assigned Technician & Target Date */}
                  <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--ash-600)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Technician: <strong>{r.assigned_technician}</strong></span>
                    <span>Target: <strong>{formatDate(r.expected_completion)}</strong></span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ash-100)', paddingTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      setActiveTicket(r);
                      setIsDetailsModalOpen(true);
                    }}
                  >
                    <Eye size={13} /> View Ticket
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        setActiveTicket(r);
                        setIsJobCardModalOpen(true);
                      }}
                    >
                      <Printer size={13} /> Job Card
                    </button>

                    {r.status !== 'completed' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '5px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          const next = r.status === 'pending' ? 'in_repair' : r.status === 'in_repair' ? 'ready' : 'completed';
                          handleUpdateStatus(r.id, next);
                        }}
                      >
                        <CheckCircle size={13} /> Next Step
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* PROFESSIONAL ENTERPRISE TABLE VIEW (FITTED 100% TO PAGE) */
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid var(--ash-200)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <div className="table-responsive" style={{ margin: 0, width: '100%', overflowX: 'auto' }}>
            <table className="custom-table" style={{ margin: 0, width: '100%', minWidth: '1060px', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', borderBottom: '1px solid var(--ash-200)' }}>
                  <th style={{ width: '15%', minWidth: '145px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Ticket & Date
                  </th>
                  <th style={{ width: '15%', minWidth: '145px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Contract & Item
                  </th>
                  <th style={{ width: '18%', minWidth: '175px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Client Profile & NIC
                  </th>
                  <th style={{ width: '14%', minWidth: '140px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Defect Category
                  </th>
                  <th style={{ width: '8%', minWidth: '85px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    Priority
                  </th>
                  <th style={{ width: '13%', minWidth: '130px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    Workflow Status
                  </th>
                  <th style={{ width: '10%', minWidth: '110px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Technician
                  </th>
                  <th style={{ width: '7%', minWidth: '95px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRepairs.map((r, idx) => {
                  const stInfo = REPAIR_STATUSES[r.status] || REPAIR_STATUSES.pending;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid var(--ash-100)',
                        background: idx % 2 === 0 ? '#fff' : 'var(--ash-50)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : 'var(--ash-50)')}
                    >
                      {/* 1. Ticket & Date */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: '#2563EB',
                            fontSize: '0.78rem',
                            background: '#EFF6FF',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #BFDBFE',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🔧 {r.ticket_no}
                        </span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          📅 {formatDate(r.date_reported)} • {r.action_type}
                        </div>
                      </td>

                      {/* 2. Contract & Item */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: 'var(--primary)',
                            fontSize: '0.78rem',
                            background: '#F1F5F9',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--ash-200)',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          📜 {r.contract_no}
                        </span>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--ash-800)', marginTop: '2px', whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.item_name}>
                          🛋️ {r.item_name}
                        </div>
                      </td>

                      {/* 3. Client Profile & NIC */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--ash-900)', whiteSpace: 'nowrap', maxWidth: '175px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.customer_name}>
                          {r.customer_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                            🆔 {r.customer_nic || r.customer_id}
                          </span>
                          {r.customer_phone && <span style={{ color: 'var(--ash-500)' }}>• 📞 {r.customer_phone}</span>}
                        </div>
                      </td>

                      {/* 4. Defect Category */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--ash-800)', whiteSpace: 'nowrap' }}>
                          {r.category}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '1px', whiteSpace: 'nowrap' }}>
                          Cost: <strong>{r.cost_bearer}</strong>
                        </div>
                      </td>

                      {/* 5. Priority */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: r.priority === 'Urgent' ? '#FEF2F2' : r.priority === 'High' ? '#FFFBEB' : '#F1F5F9',
                            color: r.priority === 'Urgent' ? '#DC2626' : r.priority === 'High' ? '#D97706' : '#475569',
                            border: `1px solid ${r.priority === 'Urgent' ? '#FCA5A5' : r.priority === 'High' ? '#FDE68A' : '#CBD5E1'}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.priority}
                        </span>
                      </td>

                      {/* 6. Status */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: stInfo.bg,
                            color: stInfo.color,
                            border: `1px solid ${stInfo.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stInfo.color, flexShrink: 0 }} />
                          {stInfo.label}
                        </span>
                      </td>

                      {/* 7. Assigned Technician */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ash-800)', whiteSpace: 'nowrap', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.assigned_technician}>
                          👤 {r.assigned_technician?.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--ash-500)', marginTop: '1px', whiteSpace: 'nowrap' }}>
                          Due: {formatDate(r.expected_completion)}
                        </div>
                      </td>

                      {/* 8. Actions */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 7px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                            title="View Ticket Details & Update Status"
                            onClick={() => {
                              setActiveTicket(r);
                              setIsDetailsModalOpen(true);
                            }}
                          >
                            <Eye size={12} /> View
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}
                            title="Print Workshop Job Card"
                            onClick={() => {
                              setActiveTicket(r);
                              setIsJobCardModalOpen(true);
                            }}
                          >
                            <Printer size={12} /> Job Card
                          </button>

                          <button
                            type="button"
                            style={{
                              border: '1px solid var(--ash-200)',
                              background: '#fff',
                              color: 'var(--ash-400)',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: '5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                            title="Delete Ticket"
                            onClick={() => handleDeleteTicket(r.id, r.ticket_no)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#DC2626';
                              e.currentTarget.style.borderColor = '#FCA5A5';
                              e.currentTarget.style.background = '#FEF2F2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--ash-400)';
                              e.currentTarget.style.borderColor = 'var(--ash-200)';
                              e.currentTarget.style.background = '#fff';
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div
            style={{
              padding: '12px 18px',
              background: '#F8FAFC',
              borderTop: '1px solid var(--ash-200)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.8rem',
              color: 'var(--ash-600)',
            }}
          >
            <div>
              Showing <strong>{filteredRepairs.length}</strong> of <strong>{repairs.length}</strong> total warranty and repair jobs
            </div>
            <div>
              Active in Workshop: <strong style={{ color: '#2563EB', fontSize: '0.9rem' }}>{stats.activeWorkshop}</strong>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          5. MODAL: LOG NEW RETURN / REPAIR TICKET
          ========================================================= */}
      <Modal
        isOpen={isLogTicketModalOpen}
        onClose={() => setIsLogTicketModalOpen(false)}
        title="🔧 Log Return, Touch-up or Repair Job"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* STEP 1: SELECT CONTRACT / CLIENT */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)', position: 'relative' }}>
            {isContractDropdownOpen && (
              <div
                onClick={() => setIsContractDropdownOpen(false)}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 55, background: 'transparent' }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.86rem' }}>
                1. Select Furniture Order / Contract *
              </label>
              {selectedOrder && (
                <button
                  type="button"
                  onClick={() => handleSelectOrder(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={12} /> Clear / Change
                </button>
              )}
            </div>

            <div style={{ position: 'relative', zIndex: 60 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search by Contract Code, Customer Name, NIC, or Furniture Item..."
                value={formContractSearch}
                onFocus={() => setIsContractDropdownOpen(true)}
                onChange={(e) => {
                  setFormContractSearch(e.target.value);
                  setIsContractDropdownOpen(true);
                }}
                style={{ paddingLeft: '36px', fontWeight: 700, fontSize: '0.88rem' }}
              />

              {/* Suggestions Popover */}
              {isContractDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid var(--primary-border)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 65,
                  }}
                >
                  {orderSuggestions.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--ash-500)' }}>
                      No orders found matching search.
                    </div>
                  ) : (
                    orderSuggestions.map((ord) => (
                      <div
                        key={ord.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectOrder(ord);
                        }}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--ash-100)',
                          cursor: 'pointer',
                          background: selectedOrder?.id === ord.id ? 'var(--primary-tint)' : '#fff',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-tint)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = selectedOrder?.id === ord.id ? 'var(--primary-tint)' : '#fff')}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)', fontSize: '0.8rem' }}>
                              📜 {ord.contract_no}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--ash-900)', fontSize: '0.84rem' }}>
                              {ord.customer_name}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                            🛋️ {ord.item_name} • NIC: {ord.customer_nic || ord.customer_id}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ash-600)', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                          {ord.branch_code}/{ord.center_code}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Order Summary Card */}
            {selectedOrder && (
              <div
                style={{
                  marginTop: '12px',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Client</span>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1E3A8A', marginTop: '1px' }}>
                    {selectedOrder.customer_name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#3B82F6' }}>
                    📞 {selectedOrder.customer_phone}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Furniture Item</span>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1E3A8A', marginTop: '1px' }}>
                    {selectedOrder.item_name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#3B82F6' }}>
                    Code: {selectedOrder.item_code}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Contract Code</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.88rem', color: '#1D4ED8', marginTop: '1px' }}>
                    📜 {selectedOrder.contract_no}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#3B82F6' }}>
                    Delivery: {formatDate(selectedOrder.date)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: DEFECT & WORKSHOP SPECIFICATIONS */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)' }}>
            <label className="form-label" style={{ fontWeight: 800, marginBottom: '10px', fontSize: '0.86rem' }}>
              2. Defect Classification & Repair Plan *
            </label>

            <div className="form-grid" style={{ gap: '12px' }}>
              {/* Category */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Defect / Issue Category *
                </label>
                <select
                  className="form-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  {REPAIR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Priority Level *
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`btn ${formPriority === p ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '7px 4px', fontSize: '0.72rem', fontWeight: 700 }}
                      onClick={() => setFormPriority(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Type */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Resolution Action *
                </label>
                <select
                  className="form-input"
                  value={formActionType}
                  onChange={(e) => setFormActionType(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  <option value="Workshop Repair">Bring to Workshop for Carpentry / Polish</option>
                  <option value="On-site Carpenter Visit">On-site Customer Residence Visit</option>
                  <option value="Item Replacement">Complete Item Replacement / Exchange</option>
                  <option value="Refund / Credit Note">Customer Refund / Credit Note</option>
                </select>
              </div>

              {/* Cost Handling */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Cost Bearer *
                </label>
                <select
                  className="form-input"
                  value={formCostBearer}
                  onChange={(e) => setFormCostBearer(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  <option value="Under Warranty">Free Under 5-Year Wood Warranty</option>
                  <option value="Customer Paid">Customer Charged (Accidental Damage)</option>
                  <option value="Workshop Loss">Workshop Internal Rework Loss</option>
                </select>
              </div>

              {/* Assigned Technician */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Assigned Master Carpenter / Technician *
                </label>
                <select
                  className="form-input"
                  value={formAssignedTechnician}
                  onChange={(e) => setFormAssignedTechnician(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  {WORKSHOP_TECHNICIANS.map((tech) => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
              </div>

              {/* Expected Completion Date */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Target Completion Date *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formExpectedCompletion}
                  onChange={(e) => setFormExpectedCompletion(e.target.value)}
                />
              </div>
            </div>

            {/* Issue Description */}
            <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                Defect Description & Customer Notes *
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Describe the issue in detail e.g. lacquer peeling on right armrest, drawer runner jam..."
                value={formIssueDescription}
                onChange={(e) => setFormIssueDescription(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsLogTicketModalOpen(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleSubmitTicket(true)}
              disabled={!selectedOrder || !formIssueDescription}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Printer size={15} /> Save & Print Job Card
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSubmitTicket(false)}
              disabled={!selectedOrder || !formIssueDescription}
              style={{ fontWeight: 800, padding: '9px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle size={16} /> Confirm & Log Ticket
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================
          6. MODAL: VIEW TICKET DETAILS & UPDATE STATUS
          ========================================================= */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={activeTicket ? `Repair Ticket - ${activeTicket.ticket_no}` : 'Ticket Details'}
      >
        {activeTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Status Bar */}
            <div
              style={{
                background: REPAIR_STATUSES[activeTicket.status]?.bg || '#EFF6FF',
                border: `1px solid ${REPAIR_STATUSES[activeTicket.status]?.border || '#BFDBFE'}`,
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-600)', fontWeight: 800, textTransform: 'uppercase' }}>TICKET STATUS</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: REPAIR_STATUSES[activeTicket.status]?.color || '#1D4ED8' }}>
                  {REPAIR_STATUSES[activeTicket.status]?.label || activeTicket.status}
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--ash-600)' }}>
                <div>Reported: <strong>{formatDate(activeTicket.date_reported)}</strong></div>
                <div>Target Date: <strong>{formatDate(activeTicket.expected_completion)}</strong></div>
              </div>
            </div>

            {/* Quick Status Workflow Changer */}
            <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--ash-200)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Move Ticket to Next Workflow Stage:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeTicket.id, 'pending')}
                  className={`btn ${activeTicket.status === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700 }}
                >
                  Pending Inspection
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeTicket.id, 'in_repair')}
                  className={`btn ${activeTicket.status === 'in_repair' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700 }}
                >
                  In Workshop Repair
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeTicket.id, 'ready')}
                  className={`btn ${activeTicket.status === 'ready' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700 }}
                >
                  Ready for Handover
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeTicket.id, 'completed')}
                  className={`btn ${activeTicket.status === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700 }}
                >
                  Mark Completed
                </button>
              </div>
            </div>

            {/* 2-Column Info: Customer & Furniture Item */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#fff', border: '1px solid var(--ash-200)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', fontWeight: 800, textTransform: 'uppercase' }}>Client Profile</span>
                <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--ash-900)', marginTop: '2px' }}>
                  {activeTicket.customer_name}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--ash-700)' }}>
                  <div>NIC: <strong>{activeTicket.customer_nic}</strong></div>
                  <div>Phone: <strong>{activeTicket.customer_phone}</strong></div>
                  <div>Center: {activeTicket.branch_code}/{activeTicket.center_code}</div>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--ash-200)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', fontWeight: 800, textTransform: 'uppercase' }}>Furniture Piece</span>
                <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--ash-900)', marginTop: '2px' }}>
                  {activeTicket.item_name}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--ash-700)' }}>
                  <div>Contract: <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{activeTicket.contract_no}</strong></div>
                  <div>Category: {activeTicket.category}</div>
                  <div>Technician: <strong>{activeTicket.assigned_technician}</strong></div>
                </div>
              </div>
            </div>

            {/* Issue Description Box */}
            <div style={{ background: '#F8FAFC', border: '1px solid var(--ash-200)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', fontWeight: 800, textTransform: 'uppercase' }}>Reported Defect</span>
              <p style={{ margin: '4px 0 0', color: 'var(--ash-800)', lineHeight: 1.4 }}>
                {activeTicket.issue_description}
              </p>
              {activeTicket.resolution_notes && (
                <div style={{ marginTop: '8px', borderTop: '1px dashed var(--ash-300)', paddingTop: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 800, textTransform: 'uppercase' }}>Workshop Resolution Notes:</span>
                  <p style={{ margin: '2px 0 0', color: '#166534' }}>{activeTicket.resolution_notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ash-200)', paddingTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                onClick={() => handleDeleteTicket(activeTicket.id, activeTicket.ticket_no)}
              >
                <Trash2 size={14} /> Delete Ticket
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setIsJobCardModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Printer size={15} /> Print Job Card
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsDetailsModalOpen(false)}
                  style={{ padding: '8px 20px', fontWeight: 800 }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          7. MODAL: OFFICIAL PRINTABLE WORKSHOP JOB CARD
          ========================================================= */}
      <Modal
        isOpen={isJobCardModalOpen}
        onClose={() => setIsJobCardModalOpen(false)}
        title={activeTicket ? `Job Card - ${activeTicket.ticket_no}` : 'Workshop Job Card'}
      >
        {activeTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              id="printable-repair-job-card"
              style={{
                background: '#fff',
                padding: '22px',
                border: '1px solid var(--ash-300)',
                borderRadius: '8px',
                color: '#1e293b',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    D N S HOME SOLUTIONS
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Quality Assurance & Carpentry Job Card • Hub: {activeTicket.branch_code}/{activeTicket.center_code}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>WORKSHOP JOB CARD</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 900, color: '#2563eb' }}>
                    {activeTicket.ticket_no}
                  </div>
                </div>
              </div>

              {/* Meta Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0', fontSize: '0.82rem' }}>
                <div>
                  <div>Client: <strong>{activeTicket.customer_name}</strong></div>
                  <div>NIC: <strong>{activeTicket.customer_nic}</strong></div>
                  <div>Phone: {activeTicket.customer_phone || 'N/A'}</div>
                  <div>Contract: <strong style={{ fontFamily: 'monospace' }}>{activeTicket.contract_no}</strong></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Reported Date: <strong>{formatDate(activeTicket.date_reported)}</strong></div>
                  <div>Target Due Date: <strong>{formatDate(activeTicket.expected_completion)}</strong></div>
                  <div>Priority: <strong style={{ color: activeTicket.priority === 'Urgent' ? '#dc2626' : '#2563eb' }}>{activeTicket.priority}</strong></div>
                  <div>Warranty Status: <strong>{activeTicket.cost_bearer}</strong></div>
                </div>
              </div>

              {/* Furniture Spec */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px', margin: '10px 0', fontSize: '0.82rem' }}>
                <div>Furniture Model: <strong>{activeTicket.item_name}</strong> ({activeTicket.item_code})</div>
                <div>Defect Category: <strong>{activeTicket.category}</strong></div>
                <div>Action Requested: <strong>{activeTicket.action_type}</strong></div>
                <div>Assigned Technician: <strong>{activeTicket.assigned_technician}</strong></div>
              </div>

              {/* Work Instructions */}
              <div style={{ margin: '12px 0', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem', color: '#64748b' }}>
                  Detailed Defect & Workshop Instructions:
                </span>
                <p style={{ margin: '4px 0 0', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '4px', color: '#334155' }}>
                  {activeTicket.issue_description}
                </p>
              </div>

              {/* Quality Checklist */}
              <div style={{ margin: '14px 0', fontSize: '0.76rem', color: '#475569' }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', color: '#0f172a' }}>Workmanship Sign-off Checklist:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                  <div>[ &nbsp; ] Surface sanded & lacquer color-matched</div>
                  <div>[ &nbsp; ] Structural joints and hinges reinforced</div>
                  <div>[ &nbsp; ] Final quality inspection passed</div>
                  <div>[ &nbsp; ] Protective bubble-wrap packing complete</div>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '35px', paddingTop: '10px', fontSize: '0.76rem', color: '#64748b' }}>
                <div style={{ textAlign: 'center', width: '160px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Master Carpenter Signature
                </div>
                <div style={{ textAlign: 'center', width: '160px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Workshop Supervisor QA
                </div>
                <div style={{ textAlign: 'center', width: '160px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                  Customer Acceptance
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsJobCardModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Printer size={15} /> Print Job Card
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
