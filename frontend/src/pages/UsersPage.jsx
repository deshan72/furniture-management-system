import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Crown,
  Briefcase,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
  Download,
  Check,
  X,
  Lock,
  Sliders,
  AlertCircle,
  CheckCircle2,
  FileText,
  Boxes,
  Users,
  Building2,
  WalletCards,
  ShoppingCart,
  BarChart3,
  Settings,
  Layers,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import {
  SYSTEM_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  loadAllRoles,
  saveRole,
  deleteRole,
  resetRoleToDefaults,
  getActiveRole,
  setActiveRole,
  getActiveUser,
} from '../utils/rolesData';

// Color Palette for Role Accents
const ROLE_COLORS = [
  { name: 'Purple (Admin)', hex: '#9333EA', bg: 'rgba(147, 51, 234, 0.14)', border: 'rgba(147, 51, 234, 0.35)' },
  { name: 'Royal Blue (Exec)', hex: '#2563EB', bg: 'rgba(37, 99, 235, 0.14)', border: 'rgba(37, 99, 235, 0.35)' },
  { name: 'Emerald (Sales)', hex: '#059669', bg: 'rgba(5, 150, 105, 0.14)', border: 'rgba(5, 150, 105, 0.35)' },
  { name: 'Amber (Stock)', hex: '#D97706', bg: 'rgba(217, 119, 6, 0.14)', border: 'rgba(217, 119, 6, 0.35)' },
  { name: 'Rose (Audit)', hex: '#E11D48', bg: 'rgba(225, 29, 72, 0.14)', border: 'rgba(225, 29, 72, 0.35)' },
  { name: 'Cyan (Showroom)', hex: '#0891B2', bg: 'rgba(8, 145, 178, 0.14)', border: 'rgba(8, 145, 178, 0.35)' },
];

export default function UsersPage({
  currentRole,
  onRoleChange,
  currentUser,
  onUserChange,
}) {
  // Roles catalog state
  const [roles, setRoles] = useState(() => loadAllRoles());

  // Active simulated role
  const [internalActiveRole, setInternalActiveRole] = useState(() => currentRole || currentUser?.role || getActiveRole());
  const activeRole = currentRole || currentUser?.role || internalActiveRole;

  // View mode: 'table' | 'cards' | 'matrix'
  const [viewMode, setViewMode] = useState('table');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'system' | 'custom'
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // Form State for Add / Edit Modal
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    name_si: '',
    shortLabel: '',
    description: '',
    color: '#059669',
    permissions: [],
  });

  // Modal Permission Search Filter
  const [modalPermSearch, setModalPermSearch] = useState('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reload roles from storage
  const refreshRoles = () => {
    setRoles(loadAllRoles());
  };

  // Switch Live Simulated Role
  const handleSimulateRole = (targetRole) => {
    setInternalActiveRole(targetRole);
    setActiveRole(targetRole);
    if (onRoleChange) {
      onRoleChange(targetRole);
    }
    if (onUserChange) {
      onUserChange(getActiveUser());
    }
    showToast(
      targetRole === 'admin'
        ? 'Switched active view to: 👑 Administrator (Full Privileges)'
        : `Switched active view to: 💼 ${targetRole.toUpperCase()} Role`
    );
  };

  // Filtered Roles list
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.name_si && r.name_si.toLowerCase().includes(q)) ||
        (r.shortLabel && r.shortLabel.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q));

      const matchFilter =
        roleFilter === 'all'
          ? true
          : roleFilter === 'system'
          ? r.isSystem
          : !r.isSystem;

      return matchSearch && matchFilter;
    });
  }, [roles, searchQuery, roleFilter]);

  // Group modules by Category
  const modulesByCategory = useMemo(() => {
    const map = {};
    SYSTEM_MODULES.forEach((m) => {
      if (!map[m.category]) {
        map[m.category] = [];
      }
      map[m.category].push(m);
    });
    return map;
  }, []);

  // Categories list
  const categoriesList = useMemo(() => {
    return Array.from(new Set(SYSTEM_MODULES.map((m) => m.category)));
  }, []);

  // Icon getter for Category
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Main':
        return <BarChart3 size={15} />;
      case 'Orders & Billing':
        return <FileText size={15} />;
      case 'Inventory':
        return <Boxes size={15} />;
      case 'Customers':
        return <Users size={15} />;
      case 'Centers':
        return <Building2 size={15} />;
      case 'Finance & Cash':
        return <WalletCards size={15} />;
      case 'Purchasing':
        return <ShoppingCart size={15} />;
      case 'Reports':
        return <BarChart3 size={15} />;
      case 'Administration':
        return <Settings size={15} />;
      default:
        return <Layers size={15} />;
    }
  };

  // Sensitivity Badge renderer
  const renderSensitivityBadge = (level) => {
    switch (level) {
      case 'Financial':
        return (
          <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.14)', color: '#D97706', fontWeight: 600, border: '1px solid rgba(217, 119, 6, 0.25)' }}>
            💰 Financial
          </span>
        );
      case 'System Critical':
        return (
          <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.14)', color: '#EF4444', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            ⚠️ Admin Critical
          </span>
        );
      case 'Operational':
        return (
          <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.14)', color: '#2563EB', fontWeight: 600, border: '1px solid rgba(37, 99, 235, 0.25)' }}>
            💼 Operational
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px', background: 'var(--ash-200)', color: 'var(--text-muted)', fontWeight: 600 }}>
            Standard
          </span>
        );
    }
  };

  // ==========================================================
  // CRUD HANDLERS
  // ==========================================================

  // Open Create Modal
  const handleOpenAddModal = () => {
    setFormData({
      id: '',
      name: '',
      name_si: '',
      shortLabel: '',
      description: '',
      color: '#059669',
      permissions: [...DEFAULT_ROLE_PERMISSIONS.executive],
    });
    setModalPermSearch('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (role) => {
    setSelectedRole(role);
    setFormData({
      id: role.id,
      name: role.name,
      name_si: role.name_si || role.name,
      shortLabel: role.shortLabel || 'ROLE',
      description: role.description || '',
      color: role.color || '#2563EB',
      permissions: [...role.permissions],
    });
    setModalPermSearch('');
    setIsEditModalOpen(true);
  };

  // Open View Modal
  const handleOpenViewModal = (role) => {
    setSelectedRole(role);
    setIsViewModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (role) => {
    if (role.isSystem) {
      showToast('Core system roles (Administrator / Executive) are protected and cannot be deleted.', 'error');
      return;
    }
    setSelectedRole(role);
    setIsDeleteModalOpen(true);
  };

  // Submit Create Role
  const handleSaveNewRole = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please provide a valid Role Name.', 'error');
      return;
    }

    const colorMatch = ROLE_COLORS.find((c) => c.hex === formData.color) || ROLE_COLORS[2];
    const payload = {
      ...formData,
      bg: colorMatch.bg,
      border: colorMatch.border,
      shortLabel: formData.shortLabel.trim().toUpperCase() || formData.name.slice(0, 5).toUpperCase(),
    };

    const saved = saveRole(payload);
    if (saved) {
      refreshRoles();
      setIsAddModalOpen(false);
      showToast(`Custom Role "${saved.name}" successfully created!`);
    } else {
      showToast('Failed to create role. Please try again.', 'error');
    }
  };

  // Submit Edit Role
  const handleSaveEditRole = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Role Name cannot be empty.', 'error');
      return;
    }

    const colorMatch = ROLE_COLORS.find((c) => c.hex === formData.color) || ROLE_COLORS[1];
    const payload = {
      ...formData,
      bg: colorMatch.bg,
      border: colorMatch.border,
    };

    const updated = saveRole(payload);
    if (updated) {
      refreshRoles();
      setIsEditModalOpen(false);
      showToast(`Role "${updated.name}" permissions successfully updated!`);
      if (onRoleChange) {
        onRoleChange(activeRole);
      }
    } else {
      showToast('Failed to update role permissions.', 'error');
    }
  };

  // Confirm Delete Role
  const handleConfirmDelete = () => {
    if (!selectedRole) return;
    const res = deleteRole(selectedRole.id);
    if (res.success) {
      refreshRoles();
      setIsDeleteModalOpen(false);
      showToast(`Role "${selectedRole.name}" was deleted successfully.`);
      if (activeRole === selectedRole.id) {
        handleSimulateRole('admin');
      }
    } else {
      showToast(res.message || 'Cannot delete role.', 'error');
    }
  };

  // Reset Role to Defaults
  const handleResetRole = (role) => {
    if (window.confirm(`Reset permissions for "${role.name}" back to factory presets?`)) {
      resetRoleToDefaults(role.id);
      refreshRoles();
      showToast(`Permissions for "${role.name}" reset to system defaults.`);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
  };

  // Toggle single module in Modal form
  const handleToggleModalPermission = (moduleId) => {
    if (formData.id === 'admin') {
      showToast('Administrator role has mandatory full access to all system modules.', 'error');
      return;
    }
    const exists = formData.permissions.includes(moduleId);
    const updated = exists
      ? formData.permissions.filter((id) => id !== moduleId)
      : [...formData.permissions, moduleId];
    setFormData((prev) => ({ ...prev, permissions: updated }));
  };

  // Apply quick preset in Modal form
  const handleApplyFormPreset = (presetKey) => {
    let perms = [];
    switch (presetKey) {
      case 'all':
        perms = SYSTEM_MODULES.map((m) => m.id);
        break;
      case 'none':
        perms = ['dashboard'];
        break;
      case 'sales_cashier':
        perms = ['dashboard', 'orders', 'payments', 'returns', 'products', 'customers', 'outstanding', 'cashbook'];
        break;
      case 'workshop_stock':
        perms = ['dashboard', 'products', 'categories', 'stock', 'low-stock', 'returns', 'purchases'];
        break;
      case 'standard':
      default:
        perms = [...DEFAULT_ROLE_PERMISSIONS.executive];
        break;
    }
    setFormData((prev) => ({ ...prev, permissions: perms }));
    showToast(`Applied preset (${perms.length} modules selected).`);
  };

  // Toggle permission directly inside Matrix View for a role
  const handleToggleMatrixPermission = (roleId, moduleId) => {
    if (roleId === 'admin') {
      showToast('Administrator permissions are permanent and cannot be removed.', 'error');
      return;
    }
    const targetRole = roles.find((r) => r.id === roleId);
    if (!targetRole) return;

    const exists = targetRole.permissions.includes(moduleId);
    const updatedPerms = exists
      ? targetRole.permissions.filter((id) => id !== moduleId)
      : [...targetRole.permissions, moduleId];

    saveRole({ ...targetRole, permissions: updatedPerms });
    refreshRoles();
    showToast(`Updated "${targetRole.shortLabel}" permission for ${moduleId}`);
  };

  // Download Roles Backup / Export
  const handleExportRoles = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(roles, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `ds_furniture_roles_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Roles catalog exported successfully.');
  };

  const isFilterActive = searchQuery.trim() !== '' || roleFilter !== 'all';

  return (
    <div className="users-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastMessage.type === 'error' ? 'var(--error)' : 'var(--primary)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ==========================================================
          1. STAT CARDS ROW (KPI OVERVIEW)
          ========================================================== */}
      <div className="stats-grid">
        <StatCard
          title="Total System Roles"
          value={`${roles.length} Roles`}
          subtitle={`${roles.filter((r) => r.isSystem).length} System • ${roles.filter((r) => !r.isSystem).length} Custom`}
          icon={ShieldCheck}
          color="#2563EB"
          bg="rgba(37, 99, 235, 0.12)"
        />
        <StatCard
          title="Full Access Roles"
          value={`${roles.filter((r) => r.permissions.length === SYSTEM_MODULES.length).length} Role`}
          subtitle="Administrator (100% Unrestricted)"
          icon={Crown}
          color="#9333EA"
          bg="rgba(147, 51, 234, 0.12)"
        />
        <StatCard
          title="Operational Roles"
          value={`${roles.filter((r) => r.permissions.length < SYSTEM_MODULES.length).length} Roles`}
          subtitle="Executive & Showroom Staff"
          icon={Briefcase}
          color="#059669"
          bg="rgba(5, 150, 105, 0.12)"
        />
        <StatCard
          title="System Modules"
          value={`${SYSTEM_MODULES.length} Pages`}
          subtitle="Across 9 Business Categories"
          icon={Boxes}
          color="#D97706"
          bg="rgba(217, 119, 6, 0.12)"
        />
      </div>

      {/* ==========================================================
          2. FILTER & ACTION TOOLBAR (CRUCIAL CRUD TOOLBAR)
          ========================================================== */}
      <div className="filter-card">
        {/* Row 1: Search Box + Action Buttons */}
        <div className="filter-row-top">
          <div className="filter-search-box">
            <Search className="filter-search-icon" size={17} />
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search roles by title, description or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="filter-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear Search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="filter-actions-group">
            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                Table View
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
              >
                Cards View
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'matrix' ? 'active' : ''}`}
                onClick={() => setViewMode('matrix')}
              >
                Permissions Matrix
              </button>
            </div>

            {/* Export JSON Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportRoles}
              style={{ padding: '9px 14px', fontSize: '0.84rem', gap: '6px' }}
              title="Export Roles catalog as JSON"
            >
              <Download size={15} /> Export
            </button>

            {/* + Create New Role Button */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAddModal}
              style={{ padding: '9px 16px', fontSize: '0.84rem', gap: '6px', fontWeight: 600 }}
            >
              <Plus size={16} /> + Create Role
            </button>
          </div>
        </div>

        {/* Row 2: Filter chips + Reset Action */}
        <div className="filter-row-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
          <button
            type="button"
            className={`filter-chip-btn ${roleFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRoleFilter('all')}
          >
            All Roles ({roles.length})
          </button>
          <button
            type="button"
            className={`filter-chip-btn ${roleFilter === 'system' ? 'active' : ''}`}
            onClick={() => setRoleFilter('system')}
          >
            System Core ({roles.filter((r) => r.isSystem).length})
          </button>
          <button
            type="button"
            className={`filter-chip-btn ${roleFilter === 'custom' ? 'active' : ''}`}
            onClick={() => setRoleFilter('custom')}
          >
            Custom Roles ({roles.filter((r) => !r.isSystem).length})
          </button>

          {isFilterActive && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
              style={{ padding: '4px 10px', fontSize: '0.75rem', marginLeft: 'auto', gap: '4px' }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ==========================================================
          VIEW 1: TABLE VIEW (ENTERPRISE CRUD TABLE)
          ========================================================== */}
      {viewMode === 'table' && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>Role Identity</th>
                <th style={{ minWidth: '280px' }}>Description & Scope</th>
                <th style={{ textAlign: 'center', minWidth: '180px' }}>Access Coverage</th>
                <th style={{ textAlign: 'center', minWidth: '130px' }}>Classification</th>
                <th style={{ textAlign: 'center', minWidth: '110px' }}>Status</th>
                <th style={{ textAlign: 'center', minWidth: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role) => {
                const totalModules = SYSTEM_MODULES.length;
                const allowedCount = role.permissions.length;
                const percentage = Math.round((allowedCount / totalModules) * 100);
                const isCurrentSimulated = activeRole === role.id;

                return (
                  <tr key={role.id}>
                    {/* Role Identity */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            backgroundColor: role.bg || 'rgba(37, 99, 235, 0.14)',
                            color: role.color || '#2563EB',
                            border: `1.5px solid ${role.border || 'rgba(37, 99, 235, 0.3)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {role.id === 'admin' ? <Crown size={18} /> : <Briefcase size={18} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                              {role.name}
                            </strong>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '6px',
                                backgroundColor: role.bg || 'var(--ash-100)',
                                color: role.color || 'var(--primary)',
                                border: `1px solid ${role.border || 'transparent'}`,
                              }}
                            >
                              {role.shortLabel}
                            </span>
                            {isCurrentSimulated && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  padding: '1px 6px',
                                  borderRadius: '8px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10B981',
                                  fontWeight: 700,
                                }}
                              >
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {role.id === 'admin'
                              ? 'Super Administrator'
                              : role.id === 'executive'
                              ? 'Showroom & Operations Staff'
                              : (role.name_si && !/[\u0D80-\u0DFF]/.test(role.name_si) ? role.name_si : role.shortLabel || 'Custom Role')}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.45', maxWidth: '380px' }}>
                        {role.description}
                      </p>
                    </td>

                    {/* Access Coverage Progress */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
                          <span style={{ color: role.color || 'var(--primary)' }}>
                            {allowedCount} / {totalModules} Modules
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({percentage}%)</span>
                        </div>
                        {/* Progress Bar */}
                        <div
                          style={{
                            width: '120px',
                            height: '6px',
                            backgroundColor: 'var(--ash-200)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${percentage}%`,
                              height: '100%',
                              backgroundColor: role.color || 'var(--primary)',
                              borderRadius: '3px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Classification */}
                    <td style={{ textAlign: 'center' }}>
                      {role.isSystem ? (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: 'rgba(147, 51, 234, 0.12)',
                            color: '#9333EA',
                            fontWeight: 700,
                            border: '1px solid rgba(147, 51, 234, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Lock size={11} /> System Core
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: 'rgba(5, 150, 105, 0.12)',
                            color: '#059669',
                            fontWeight: 700,
                            border: '1px solid rgba(5, 150, 105, 0.25)',
                          }}
                        >
                          Custom Staff
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className="badge-settled"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                        <span>{role.status || 'Active'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* View Button */}
                        <button
                          type="button"
                          className="icon-btn-action"
                          title="View Role & Permissions Breakdown"
                          onClick={() => handleOpenViewModal(role)}
                        >
                          <Eye size={15} />
                        </button>

                        {/* Edit Permissions Button */}
                        <button
                          type="button"
                          className="icon-btn-action"
                          title="Edit Role & Configure Page Access"
                          onClick={() => handleOpenEditModal(role)}
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Reset Defaults Button */}
                        <button
                          type="button"
                          className="icon-btn-action"
                          title="Reset to Factory Presets"
                          onClick={() => handleResetRole(role)}
                        >
                          <RotateCcw size={15} />
                        </button>

                        {/* Delete Button */}
                        {role.canDelete ? (
                          <button
                            type="button"
                            className="icon-btn-action"
                            style={{ color: 'var(--error)' }}
                            title="Delete Custom Role"
                            onClick={() => handleOpenDeleteModal(role)}
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="icon-btn-action"
                            style={{ opacity: 0.35, cursor: 'not-allowed' }}
                            title="Protected Core Role (Cannot Delete)"
                            disabled
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ==========================================================
          VIEW 2: CARDS VIEW (VISUAL ROLES GRID)
          ========================================================== */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {filteredRoles.map((role) => {
            const totalModules = SYSTEM_MODULES.length;
            const allowedCount = role.permissions.length;
            const percentage = Math.round((allowedCount / totalModules) * 100);
            const isCurrentSimulated = activeRole === role.id;

            return (
              <div
                key={role.id}
                className="panel"
                style={{
                  padding: '22px',
                  borderTop: `4px solid ${role.color || 'var(--primary)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                {/* Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: role.bg || 'rgba(37, 99, 235, 0.14)',
                          color: role.color || '#2563EB',
                          border: `1.5px solid ${role.border || 'transparent'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {role.id === 'admin' ? <Crown size={22} /> : <Briefcase size={22} />}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          {role.name}
                        </h3>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {role.id === 'admin'
                            ? 'Super Administrator'
                            : role.id === 'executive'
                            ? 'Showroom & Operations Staff'
                            : (role.name_si && !/[\u0D80-\u0DFF]/.test(role.name_si) ? role.name_si : role.shortLabel || 'Custom Role')}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: role.bg || 'var(--ash-100)',
                        color: role.color || 'var(--primary)',
                        border: `1px solid ${role.border || 'transparent'}`,
                      }}
                    >
                      {allowedCount} / {totalModules} Pages
                    </span>
                  </div>

                  <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {role.description}
                  </p>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Access Coverage</span>
                    <strong>{percentage}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--ash-200)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: role.color || 'var(--primary)' }} />
                  </div>
                </div>

                {/* Key Modules Allowed Tags */}
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Permitted Sections:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                    {role.permissions.slice(0, 5).map((modId) => {
                      const mod = SYSTEM_MODULES.find((m) => m.id === modId);
                      return (
                        <span
                          key={modId}
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 7px',
                            borderRadius: '8px',
                            background: 'var(--ash-100)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          ✓ {mod?.label || modId}
                        </span>
                      );
                    })}
                    {role.permissions.length > 5 && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '8px', color: 'var(--text-muted)' }}>
                        +{role.permissions.length - 5} more...
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                    onClick={() => handleOpenViewModal(role)}
                  >
                    <Eye size={13} style={{ marginRight: '4px' }} />
                    <span>View Summary</span>
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                      onClick={() => handleOpenEditModal(role)}
                    >
                      <Sliders size={13} style={{ marginRight: '4px' }} />
                      <span>Configure Access</span>
                    </button>

                    <button
                      type="button"
                      className={`btn ${isCurrentSimulated ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      onClick={() => handleSimulateRole(role.id)}
                      title="Simulate this role in application sidebar and pages"
                    >
                      {isCurrentSimulated ? 'Active' : 'Simulate'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==========================================================
          VIEW 3: PERMISSIONS MATRIX (SIDE-BY-SIDE MODULE COMPARISON)
          ========================================================== */}
      {viewMode === 'matrix' && (
        <div className="panel" style={{ padding: '0px', overflow: 'hidden' }}>
          {/* Header & Quick Category Pills */}
          <div
            style={{
              padding: '16px 22px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--card-bg)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>
                System-Wide Permission Comparison Matrix
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Directly compare and toggle page access across all defined roles.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                className={`filter-chip-btn ${matrixCategoryFilter === 'all' ? 'active' : ''}`}
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                onClick={() => setMatrixCategoryFilter('all')}
              >
                All Categories ({SYSTEM_MODULES.length})
              </button>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-chip-btn ${matrixCategoryFilter === cat ? 'active' : ''}`}
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  onClick={() => setMatrixCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '220px', textAlign: 'left' }}>System Page Module</th>
                  <th style={{ minWidth: '130px', textAlign: 'left' }}>Category</th>
                  <th style={{ minWidth: '120px', textAlign: 'center' }}>Sensitivity</th>
                  {roles.map((role) => (
                    <th key={role.id} style={{ textAlign: 'center', minWidth: '150px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ color: role.color || 'var(--primary)', fontWeight: 700 }}>
                          {role.id === 'admin' ? '👑' : '💼'} {role.shortLabel}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {role.permissions.length} / {SYSTEM_MODULES.length} Allowed
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SYSTEM_MODULES.filter(
                  (m) => matrixCategoryFilter === 'all' || m.category === matrixCategoryFilter
                ).map((mod) => (
                  <tr key={mod.id}>
                    <td>
                      <div>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                          {mod.label}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {mod.description}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {mod.category}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {renderSensitivityBadge(mod.sensitivity)}
                    </td>

                    {/* Columns for each role */}
                    {roles.map((role) => {
                      const isPermitted = role.permissions.includes(mod.id);
                      const isSuperAdmin = role.id === 'admin';

                      return (
                        <td key={role.id} style={{ textAlign: 'center' }}>
                          {isSuperAdmin ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '10px',
                                background: 'rgba(147, 51, 234, 0.15)',
                                color: '#9333EA',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              <Check size={13} strokeWidth={3} /> Full Access
                            </span>
                          ) : (
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '8px',
                                background: isPermitted ? 'rgba(5, 150, 105, 0.12)' : 'var(--ash-100)',
                                color: isPermitted ? '#059669' : 'var(--text-muted)',
                                border: `1px solid ${isPermitted ? 'rgba(5, 150, 105, 0.3)' : 'var(--border-subtle)'}`,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isPermitted}
                                onChange={() => handleToggleMatrixPermission(role.id, mod.id)}
                                style={{ width: '15px', height: '15px', accentColor: '#059669', cursor: 'pointer' }}
                              />
                              <span>{isPermitted ? 'Allowed' : 'Locked'}</span>
                            </label>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 1: ADD / CREATE NEW ROLE MODAL
          ========================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Organizational Role"
      >
        <form onSubmit={handleSaveNewRole} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                Role Name (English) *
              </label>
              <input
                type="text"
                placeholder="e.g. Showroom Cashier"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                Role Alias / Secondary Label
              </label>
              <input
                type="text"
                placeholder="e.g. Cashier / Floor Officer"
                value={formData.name_si}
                onChange={(e) => setFormData({ ...formData, name_si: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                Short Code / Tag (e.g. CASH, WORKSHOP)
              </label>
              <input
                type="text"
                placeholder="e.g. CASH"
                value={formData.shortLabel}
                onChange={(e) => setFormData({ ...formData, shortLabel: e.target.value.toUpperCase() })}
                maxLength={8}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
                Accent Color
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '38px' }}>
                {ROLE_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.hex })}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: c.hex,
                      border: formData.color === c.hex ? '3px solid #FFFFFF' : '2px solid transparent',
                      boxShadow: formData.color === c.hex ? '0 0 0 2px ' + c.hex : 'none',
                      cursor: 'pointer',
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
              Role Scope & Responsibilities
            </label>
            <textarea
              rows={2}
              placeholder="Operational responsibilities and duties of this staff role..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
            />
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Module Privileges ({formData.permissions.length} of {SYSTEM_MODULES.length} Selected):
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('standard')}>
                ⭐ Standard
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('sales_cashier')}>
                💵 Sales
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('workshop_stock')}>
                🔨 Workshop
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('all')}>
                All
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('none')}>
                Clear
              </button>
            </div>
          </div>

          {/* Permissions Checklist */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {SYSTEM_MODULES.map((mod) => {
                const isChecked = formData.permissions.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: isChecked ? 'var(--primary-tint)' : 'var(--ash-50)',
                      border: `1px solid ${isChecked ? 'var(--primary-border)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleModalPermission(mod.id)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong>{mod.label}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                        {mod.category}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ fontWeight: 600 }}>
              Create Role
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================================
          MODAL 2: EDIT ROLE & PERMISSIONS MODAL
          ========================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Configure Role Permissions: ${formData.name}`}
      >
        <form onSubmit={handleSaveEditRole} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px' }}>
              Role Scope Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
            />
          </div>

          {/* Search modules & Presets toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter modules..."
                value={modalPermSearch}
                onChange={(e) => setModalPermSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 8px 6px 28px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '0.78rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('standard')}>
                ⭐ Standard
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('sales_cashier')}>
                💵 Sales
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('workshop_stock')}>
                🔨 Workshop
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('all')}>
                Select All
              </button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleApplyFormPreset('none')}>
                Clear
              </button>
            </div>
          </div>

          {/* Categorized Permissions Checklist */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(modulesByCategory).map(([category, modules]) => {
              const matchingModules = modules.filter(
                (m) =>
                  !modalPermSearch ||
                  m.label.toLowerCase().includes(modalPermSearch.toLowerCase()) ||
                  m.description.toLowerCase().includes(modalPermSearch.toLowerCase())
              );

              if (matchingModules.length === 0) return null;

              return (
                <div key={category}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    {getCategoryIcon(category)}
                    <span>{category}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {matchingModules.map((mod) => {
                      const isChecked = formData.permissions.includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: isChecked ? 'var(--primary-tint)' : 'var(--ash-50)',
                            border: `1px solid ${isChecked ? 'var(--primary-border)' : 'var(--border-subtle)'}`,
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleModalPermission(mod.id)}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <div style={{ overflow: 'hidden' }}>
                            <strong style={{ display: 'block', color: 'var(--text-main)' }}>{mod.label}</strong>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{mod.category}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {formData.permissions.length} of {SYSTEM_MODULES.length} system modules permitted.
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontWeight: 600 }}>
                Save Permissions
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ==========================================================
          MODAL 3: VIEW ROLE BREAKDOWN MODAL
          ========================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Role Summary: ${selectedRole?.name || ''}`}
      >
        {selectedRole && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Role Header Banner */}
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: selectedRole.bg || 'var(--ash-50)',
                border: `1.5px solid ${selectedRole.border || 'var(--border-subtle)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  color: selectedRole.color || '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {selectedRole.id === 'admin' ? <Crown size={24} /> : <Briefcase size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {selectedRole.name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {selectedRole.id === 'admin'
                    ? 'Super Administrator'
                    : selectedRole.id === 'executive'
                    ? 'Showroom & Operations Staff'
                    : (selectedRole.name_si && !/[\u0D80-\u0DFF]/.test(selectedRole.name_si) ? selectedRole.name_si : 'Custom Role')} • Code: <strong>{selectedRole.shortLabel}</strong>
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  {selectedRole.description}
                </p>
              </div>
            </div>

            {/* Allowed Modules List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.85rem' }}>
                  Permitted Modules ({selectedRole.permissions.length} Pages Allowed)
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {SYSTEM_MODULES.length - selectedRole.permissions.length} Pages Locked
                </span>
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {SYSTEM_MODULES.map((mod) => {
                    const isAllowed = selectedRole.permissions.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: isAllowed ? 'rgba(5, 150, 105, 0.08)' : 'var(--ash-50)',
                          color: isAllowed ? '#059669' : 'var(--text-muted)',
                          fontSize: '0.76rem',
                          border: `1px solid ${isAllowed ? 'rgba(5, 150, 105, 0.2)' : 'transparent'}`,
                        }}
                      >
                        {isAllowed ? <Check size={13} strokeWidth={3} /> : <Lock size={12} />}
                        <span>{mod.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleSimulateRole(selectedRole.id);
                }}
              >
                Simulate this Role
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEditModal(selectedRole);
                }}
              >
                Edit Permissions
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ==========================================================
          MODAL 4: DELETE CONFIRMATION MODAL
          ========================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Role Deletion"
      >
        {selectedRole && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete the custom role <strong>"{selectedRole.name}"</strong>?
              Staff members currently simulated under this role will revert to Administrator.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: 'var(--error)', color: '#FFFFFF', fontWeight: 600 }}
                onClick={handleConfirmDelete}
              >
                Delete Role Permanently
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}