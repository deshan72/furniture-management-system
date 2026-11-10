import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Search,
  Crown,
  Briefcase,
  CheckCircle,
  Hammer,
  Truck,
  RefreshCw,
  Sliders,
  Save,
  Check,
  X,
  MessageSquare,
  AlertTriangle,
  Info,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import {
  SYSTEM_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  ROLES_METADATA,
  loadSavedUsers,
  saveStaffUsers,
  loadRolePermissions,
  saveRolePermissions,
  getActiveUser,
  setActiveUser,
} from '../utils/rolesData';
import { loadSavedCenters, formatCenterCode } from '../utils/centersData';

export default function UsersPage({ currentUser, onUserChange }) {
  // Staff Users State
  const [usersList, setUsersList] = useState(() => loadSavedUsers());

  // Role Permissions Matrix State
  const [rolePermissions, setRolePermissions] = useState(() => loadRolePermissions());

  // Active persona for live test/simulation
  const [activePersona, setActivePersona] = useState(() => currentUser || getActiveUser());

  // Available Centers
  const [centers] = useState(() => loadSavedCenters());

  // Active Tab: 'roster' | 'matrix' | 'roles_info'
  const [activeTab, setActiveTab] = useState('roster');

  // Search & Filters for Staff Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Feedback notifications / toasts
  const [toastMessage, setToastMessage] = useState(null);

  // Matrix dirty tracker
  const [matrixModified, setMatrixModified] = useState(false);

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create new

  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);
  const [userForPerms, setUserForPerms] = useState(null);
  const [tempCustomPerms, setTempCustomPerms] = useState([]);
  const [useCustomPerms, setUseCustomPerms] = useState(false);

  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  // User form data state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'sales_executive',
    branch_code: 'MHG',
    center_code: 'C001',
    status: 'active',
  });

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch Active User / Persona Simulator
  const handleSwitchPersona = (userId) => {
    const selected = usersList.find((u) => u.id === userId);
    if (!selected) return;
    setActivePersona(selected);
    setActiveUser(userId);
    if (onUserChange) {
      onUserChange(selected);
    }
    showToast(`Switched active user to: ${selected.name} (${ROLES_METADATA[selected.role]?.shortLabel})`);
  };

  // Filtered users for the roster table
  const filteredUsers = useMemo(() => {
    return usersList.filter((user) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phone && user.phone.includes(q));

      // Role
      const matchRole = roleFilter === 'all' || user.role === roleFilter;

      // Branch / Center
      const matchBranch = branchFilter === 'all' || user.branch_code === branchFilter;

      // Status
      const matchStatus = statusFilter === 'all' || user.status === statusFilter;

      return matchSearch && matchRole && matchBranch && matchStatus;
    });
  }, [usersList, searchQuery, roleFilter, branchFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = usersList.length;
    const admins = usersList.filter((u) => u.role === 'admin').length;
    const sales = usersList.filter((u) => u.role === 'sales_executive').length;
    const cashiers = usersList.filter((u) => u.role === 'cashier').length;
    const workshop = usersList.filter((u) => u.role === 'workshop_supervisor').length;
    const centerOffs = usersList.filter((u) => u.role === 'center_officer').length;
    return { total, admins, sales, cashiers, workshop, centerOffs };
  }, [usersList]);

  // Open Create User Modal
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      role: 'sales_executive',
      branch_code: 'MHG',
      center_code: 'C001',
      status: 'active',
    });
    setIsUserModalOpen(true);
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      branch_code: user.branch_code || 'MHG',
      center_code: user.center_code || 'C001',
      status: user.status || 'active',
    });
    setIsUserModalOpen(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      showToast('Name and username are required', 'error');
      return;
    }

    let updatedUsers = [];
    if (editingUser) {
      updatedUsers = usersList.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              ...formData,
            }
          : u
      );
      showToast(`Staff member "${formData.name}" details updated.`);
    } else {
      const newUser = {
        id: `usr-${Date.now()}`,
        ...formData,
        custom_permissions: null,
        created_at: new Date().toISOString(),
      };
      updatedUsers = [...usersList, newUser];
      showToast(`New staff member "${formData.name}" created successfully.`);
    }

    setUsersList(updatedUsers);
    saveStaffUsers(updatedUsers);
    setIsUserModalOpen(false);

    // If edited active user, refresh persona
    if (activePersona && editingUser && activePersona.id === editingUser.id) {
      const refreshed = updatedUsers.find((u) => u.id === editingUser.id);
      setActivePersona(refreshed);
      if (onUserChange) onUserChange(refreshed);
    }
  };

  // Delete User
  const handleConfirmDelete = () => {
    if (!deleteConfirmUser) return;
    if (deleteConfirmUser.role === 'admin' && stats.admins <= 1) {
      showToast('Cannot delete the last Super Administrator.', 'error');
      setDeleteConfirmUser(null);
      return;
    }

    const updated = usersList.filter((u) => u.id !== deleteConfirmUser.id);
    setUsersList(updated);
    saveStaffUsers(updated);
    showToast(`Staff member "${deleteConfirmUser.name}" removed.`);

    // If currently active user was deleted, fallback to first user
    if (activePersona?.id === deleteConfirmUser.id) {
      const fallback = updated[0];
      setActivePersona(fallback);
      setActiveUser(fallback.id);
      if (onUserChange) onUserChange(fallback);
    }

    setDeleteConfirmUser(null);
  };

  // Open Permissions Configurator for specific user
  const handleOpenPermsModal = (user) => {
    setUserForPerms(user);
    if (Array.isArray(user.custom_permissions)) {
      setUseCustomPerms(true);
      setTempCustomPerms([...user.custom_permissions]);
    } else {
      setUseCustomPerms(false);
      // Pre-fill with their role's permissions
      const roleAllowed = rolePermissions[user.role] || [];
      setTempCustomPerms([...roleAllowed]);
    }
    setIsPermsModalOpen(true);
  };

  // Toggle module in custom permissions modal
  const handleToggleModuleInModal = (moduleId) => {
    if (!useCustomPerms) {
      setUseCustomPerms(true);
    }
    setTempCustomPerms((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  // Save custom permissions for user
  const handleSaveUserPermissions = () => {
    if (!userForPerms) return;
    const finalPerms = useCustomPerms ? tempCustomPerms : null;

    const updated = usersList.map((u) =>
      u.id === userForPerms.id ? { ...u, custom_permissions: finalPerms } : u
    );

    setUsersList(updated);
    saveStaffUsers(updated);

    if (activePersona?.id === userForPerms.id) {
      const refreshed = updated.find((u) => u.id === userForPerms.id);
      setActivePersona(refreshed);
      if (onUserChange) onUserChange(refreshed);
    }

    showToast(
      useCustomPerms
        ? `Custom permissions applied for ${userForPerms.name} (${tempCustomPerms.length} pages).`
        : `Reset ${userForPerms.name} to role defaults (${ROLES_METADATA[userForPerms.role]?.shortLabel}).`
    );

    setIsPermsModalOpen(false);
    setUserForPerms(null);
  };

  // Permissions Matrix: Direct Toggle
  const handleToggleMatrixCheckbox = (roleKey, moduleId) => {
    // Admin always retains all access for system security
    if (roleKey === 'admin') {
      showToast('Super Admin role must retain full access to all system modules.', 'error');
      return;
    }

    const currentList = rolePermissions[roleKey] || [];
    const exists = currentList.includes(moduleId);
    const updatedList = exists
      ? currentList.filter((id) => id !== moduleId)
      : [...currentList, moduleId];

    setRolePermissions((prev) => ({
      ...prev,
      [roleKey]: updatedList,
    }));
    setMatrixModified(true);
  };

  // Save Matrix changes
  const handleSaveMatrix = () => {
    saveRolePermissions(rolePermissions);
    setMatrixModified(false);
    showToast('Role permissions matrix saved successfully.');
    // Notify app if current user's role was changed
    if (activePersona && !activePersona.custom_permissions && onUserChange) {
      onUserChange({ ...activePersona });
    }
  };

  // Reset Matrix to system defaults
  const handleResetMatrixDefaults = () => {
    if (window.confirm('Reset all role permissions to system default presets?')) {
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      saveRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      setMatrixModified(false);
      showToast('Permissions reset to initial factory presets.');
      if (onUserChange) onUserChange({ ...activePersona });
    }
  };

  // Calculate page count allowed for a user
  const getUserAllowedCount = (user) => {
    if (Array.isArray(user.custom_permissions)) {
      return user.custom_permissions.length;
    }
    const roleList = rolePermissions[user.role] || [];
    return roleList.length;
  };

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

  // Icon getter for role
  const getRoleIcon = (roleKey) => {
    switch (roleKey) {
      case 'admin':
        return <Crown size={14} />;
      case 'sales_executive':
        return <Briefcase size={14} />;
      case 'cashier':
        return <CheckCircle size={14} />;
      case 'workshop_supervisor':
        return <Hammer size={14} />;
      case 'center_officer':
        return <Truck size={14} />;
      default:
        return <ShieldCheck size={14} />;
    }
  };

  return (
    <div className="users-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Alert */}
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
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP BAR: Role Simulator & Active Persona Switcher */}
      <div
        className="persona-simulator-banner"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--ash-50) 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: ROLES_METADATA[activePersona?.role]?.bg || 'rgba(30,77,140,0.1)',
              color: ROLES_METADATA[activePersona?.role]?.color || 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              border: `1.5px solid ${ROLES_METADATA[activePersona?.role]?.border || 'transparent'}`,
            }}
          >
            {getRoleIcon(activePersona?.role)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active System Persona (සජීවී පරිශීලකයා)
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: activePersona?.role === 'admin' ? 'rgba(147,51,234,0.15)' : 'rgba(37,99,235,0.15)',
                  color: activePersona?.role === 'admin' ? '#9333EA' : '#2563EB',
                  fontWeight: 600,
                }}
              >
                {activePersona?.role === 'admin' ? '👑 Full Privileges' : '💼 Executive Access'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                {activePersona?.name}
              </strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                • {ROLES_METADATA[activePersona?.role]?.shortLabel} ({activePersona?.branch_code}/{formatCenterCode(activePersona?.center_code)})
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
                [{getUserAllowedCount(activePersona)}/21 Pages Allowed]
              </span>
            </div>
          </div>
        </div>

        {/* Quick Simulator Switcher Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Simulate Persona:
          </span>
          <select
            value={activePersona?.id}
            onChange={(e) => handleSwitchPersona(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1.5px solid var(--primary)',
              background: 'var(--card-bg)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {ROLES_METADATA[u.role]?.shortLabel} ({u.branch_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div className="stats-grid">
        <StatCard
          title="Total Staff Users"
          value={stats.total}
          subtitle="System operators & leads"
          icon={Users}
          color="var(--primary)"
          bg="var(--primary-tint)"
        />
        <StatCard
          title="Super Admins"
          value={stats.admins}
          subtitle="Full access (21/21 modules)"
          icon={Crown}
          color="#9333EA"
          bg="rgba(147, 51, 234, 0.12)"
        />
        <StatCard
          title="Sales Executives"
          value={stats.sales}
          subtitle="Orders, customers & catalog"
          icon={Briefcase}
          color="#2563EB"
          bg="rgba(37, 99, 235, 0.12)"
        />
        <StatCard
          title="Cashiers & Finance"
          value={stats.cashiers}
          subtitle="Cash book & day-end close"
          icon={CheckCircle}
          color="#059669"
          bg="rgba(5, 150, 105, 0.12)"
        />
        <StatCard
          title="Workshop & Hubs"
          value={stats.workshop + stats.centerOffs}
          subtitle="Carpentry & distribution"
          icon={Hammer}
          color="#D97706"
          bg="rgba(217, 119, 6, 0.12)"
        />
      </div>

      {/* PRIMARY TAB NAVIGATION BAR */}
      <div
        className="tabs-nav-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '2px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'roster' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
            onClick={() => setActiveTab('roster')}
          >
            <Users size={16} />
            <span>Staff Members Roster (නාමාවලිය)</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 6px',
                borderRadius: '10px',
                background: activeTab === 'roster' ? 'rgba(255,255,255,0.25)' : 'var(--ash-200)',
                color: activeTab === 'roster' ? '#fff' : 'var(--text-muted)',
              }}
            >
              {filteredUsers.length}
            </span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
            onClick={() => setActiveTab('matrix')}
          >
            <Sliders size={16} />
            <span>Permissions Matrix (අවසර අනුකෘතිය)</span>
            {matrixModified && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                Unsaved
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'roles_info' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
            onClick={() => setActiveTab('roles_info')}
          >
            <Info size={16} />
            <span>Role Definitions & Guidelines</span>
          </button>
        </div>

        {activeTab === 'roster' && (
          <button
            type="button"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
            onClick={handleOpenCreateUser}
          >
            <UserPlus size={16} />
            <span>Add Staff Member (නව සාමාජිකයෙක්)</span>
          </button>
        )}

        {activeTab === 'matrix' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '0.82rem',
              }}
              onClick={handleResetMatrixDefaults}
            >
              <RefreshCw size={14} />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
              disabled={!matrixModified}
              onClick={handleSaveMatrix}
            >
              <Save size={15} />
              <span>Save Matrix Changes</span>
            </button>
          </div>
        )}
      </div>

      {/* ==========================================================
          TAB 1: STAFF MEMBERS ROSTER
          ========================================================== */}
      {activeTab === 'roster' && (
        <div className="panel" style={{ padding: '0px', overflow: 'hidden' }}>
          {/* Filters & Search Toolbar */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--card-bg)',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '380px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search staff by name, username, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--ash-50)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--ash-50)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Roles (සියලු භූමිකා)</option>
                <option value="admin">👑 Super Admin</option>
                <option value="sales_executive">💼 Sales Executive</option>
                <option value="cashier">💵 Cashier</option>
                <option value="workshop_supervisor">🔨 Workshop Lead</option>
                <option value="center_officer">🚚 Center Officer</option>
              </select>

              {/* Branch filter */}
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--ash-50)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Hubs (සියලු ශාඛා)</option>
                <option value="MHG">Maharagama (MHG)</option>
                <option value="MRT">Moratuwa (MRT)</option>
                <option value="NGB">Negombo (NGB)</option>
                <option value="DHW">Dehiwala (DHW)</option>
                <option value="CMB">Colombo (CMB)</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--ash-50)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Suspended</option>
              </select>

              {(searchQuery || roleFilter !== 'all' || branchFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '7px 12px', fontSize: '0.8rem' }}
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('all');
                    setBranchFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Roster Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ash-50)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Staff Member
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Role & Privileges
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Assigned Center
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Page Access
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Contact & WhatsApp
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Users size={36} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                        <h4 style={{ margin: 0, color: 'var(--text-main)' }}>No staff members found</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Try clearing or changing your search filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const roleMeta = ROLES_METADATA[user.role] || ROLES_METADATA.sales_executive;
                    const allowedCount = getUserAllowedCount(user);
                    const isCustom = Array.isArray(user.custom_permissions);
                    const isCurrentPersona = activePersona?.id === user.id;

                    return (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: isCurrentPersona ? 'var(--primary-tint)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Member & Username */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                backgroundColor: roleMeta.bg,
                                color: roleMeta.color,
                                border: `1.5px solid ${roleMeta.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              {user.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                  {user.name}
                                </strong>
                                {isCurrentPersona && (
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'var(--primary)',
                                      color: '#fff',
                                      fontWeight: 600,
                                    }}
                                  >
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                @{user.username}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td style={{ padding: '14px 18px' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              background: roleMeta.bg,
                              color: roleMeta.color,
                              border: `1px solid ${roleMeta.border}`,
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            {getRoleIcon(user.role)}
                            <span>{roleMeta.shortLabel}</span>
                          </div>
                        </td>

                        {/* Center / Branch */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '5px',
                                background: 'var(--ash-100)',
                                color: 'var(--ash-800)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {user.branch_code}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              / {formatCenterCode(user.center_code)}
                            </span>
                          </div>
                        </td>

                        {/* Page Access Count */}
                        <td style={{ padding: '14px 18px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenPermsModal(user)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                            title="Click to configure granular page access"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  color: allowedCount >= 18 ? '#059669' : 'var(--primary)',
                                }}
                              >
                                {allowedCount}/21 Pages
                              </span>
                              {isCustom ? (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    background: 'rgba(217, 119, 6, 0.15)',
                                    color: '#D97706',
                                    fontWeight: 600,
                                  }}
                                >
                                  Custom
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    background: 'var(--ash-100)',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  Role Default
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                              Configure Access →
                            </span>
                          </button>
                        </td>

                        {/* Contact */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {user.phone ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <a
                                  href={`tel:${user.phone}`}
                                  style={{ fontSize: '0.82rem', color: 'var(--text-main)', textDecoration: 'none' }}
                                >
                                  {user.phone}
                                </a>
                                <a
                                  href={`https://wa.me/94${user.phone.replace(/^0/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat on WhatsApp"
                                  className="icon-btn-action icon-btn-whatsapp"
                                  style={{ width: '22px', height: '22px' }}
                                >
                                  <MessageSquare size={12} />
                                </a>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                            )}
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {user.email}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <span
                            className="status-badge"
                            style={{
                              background: user.status === 'active' ? 'var(--success-tint)' : 'var(--ash-100)',
                              color: user.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
                              border: user.status === 'active' ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                            }}
                          >
                            {user.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="icon-btn-action"
                              title="Configure Page Access"
                              onClick={() => handleOpenPermsModal(user)}
                            >
                              <ShieldCheck size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn-action"
                              title="Edit Member Details"
                              onClick={() => handleOpenEditUser(user)}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn-action icon-btn-delete"
                              title="Delete Member"
                              disabled={user.role === 'admin' && stats.admins <= 1}
                              onClick={() => setDeleteConfirmUser(user)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 2: INTERACTIVE PERMISSIONS MATRIX
          ========================================================== */}
      {activeTab === 'matrix' && (
        <div className="panel" style={{ padding: '0px', overflow: 'hidden' }}>
          {/* Header Info */}
          <div
            style={{
              padding: '16px 20px',
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
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                System-Wide Role Permissions Matrix (පරිශීලක අවසර අනුකෘතිය)
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Directly check or uncheck which pages each operational role is allowed to view. Click &quot;Save Matrix Changes&quot; to apply.
              </p>
            </div>
            {matrixModified && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(217, 119, 6, 0.12)',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  color: '#D97706',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={15} />
                <span>You have unsaved matrix modifications!</span>
              </div>
            )}
          </div>

          {/* Matrix Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ash-100)', borderBottom: '1.5px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', minWidth: '240px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    System Page / Module
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '0.8rem', minWidth: '120px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span style={{ color: '#9333EA', fontWeight: 700 }}>👑 Super Admin</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Full Access</span>
                    </div>
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '0.8rem', minWidth: '130px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span style={{ color: '#2563EB', fontWeight: 700 }}>💼 Sales Exec</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Showroom Staff</span>
                    </div>
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '0.8rem', minWidth: '120px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span style={{ color: '#059669', fontWeight: 700 }}>💵 Cashier</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cash & Billing</span>
                    </div>
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '0.8rem', minWidth: '130px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span style={{ color: '#D97706', fontWeight: 700 }}>🔨 Workshop Lead</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Carpentry & Stock</span>
                    </div>
                  </th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '0.8rem', minWidth: '130px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span style={{ color: '#0284C7', fontWeight: 700 }}>🚚 Center Officer</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hub Distribution</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(modulesByCategory).map(([category, modules]) => (
                  <React.Fragment key={category}>
                    {/* Category Divider */}
                    <tr style={{ background: 'var(--ash-50)' }}>
                      <td
                        colSpan="6"
                        style={{
                          padding: '10px 18px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'var(--primary)',
                          borderTop: '1px solid var(--border-subtle)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        📂 {category} ({modules.length} Modules)
                      </td>
                    </tr>

                    {/* Modules rows */}
                    {modules.map((mod) => (
                      <tr
                        key={mod.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background-color 0.12s ease',
                        }}
                      >
                        <td style={{ padding: '12px 18px' }}>
                          <div>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>
                              {mod.label}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                              {mod.description}
                            </span>
                          </div>
                        </td>

                        {/* Admin: Readonly locked check */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span
                            title="Super Admin has locked, unrevocable access"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: 'rgba(147, 51, 234, 0.15)',
                              color: '#9333EA',
                            }}
                          >
                            <Check size={16} strokeWidth={3} />
                          </span>
                        </td>

                        {/* Sales Executive */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={(rolePermissions.sales_executive || []).includes(mod.id)}
                            onChange={() => handleToggleMatrixCheckbox('sales_executive', mod.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
                          />
                        </td>

                        {/* Cashier */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={(rolePermissions.cashier || []).includes(mod.id)}
                            onChange={() => handleToggleMatrixCheckbox('cashier', mod.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                          />
                        </td>

                        {/* Workshop Supervisor */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={(rolePermissions.workshop_supervisor || []).includes(mod.id)}
                            onChange={() => handleToggleMatrixCheckbox('workshop_supervisor', mod.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D97706' }}
                          />
                        </td>

                        {/* Center Officer */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={(rolePermissions.center_officer || []).includes(mod.id)}
                            onChange={() => handleToggleMatrixCheckbox('center_officer', mod.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0284C7' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Matrix Footer Action Bar */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--ash-50)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Changes take effect immediately upon saving and update all staff members using role defaults.
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleResetMatrixDefaults}
              >
                Reset to Defaults
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!matrixModified}
                onClick={handleSaveMatrix}
              >
                <Save size={16} />
                <span>Save Matrix Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          TAB 3: ROLE DEFINITIONS & POLICIES
          ========================================================== */}
      {activeTab === 'roles_info' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {Object.entries(ROLES_METADATA).map(([key, meta]) => {
            const count = (rolePermissions[key] || []).length;
            const staffCount = usersList.filter((u) => u.role === key).length;

            return (
              <div
                key={key}
                className="panel"
                style={{
                  borderLeft: `4px solid ${meta.color}`,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: meta.bg,
                        color: meta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getRoleIcon(key)}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {meta.label}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {staffCount} active staff member(s)
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: meta.bg,
                      color: meta.color,
                    }}
                  >
                    {count}/21 Modules
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {meta.description}
                </p>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '12px',
                    borderTop: '1px dashed var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Standard Operational Policy
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={() => {
                      setRoleFilter(key);
                      setActiveTab('roster');
                    }}
                  >
                    View Members →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==========================================================
          MODAL: ADD / EDIT STAFF MEMBER
          ========================================================== */}
      {isUserModalOpen && (
        <div className="modal-overlay" onClick={() => setIsUserModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '580px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                {editingUser ? `Edit Staff Member: ${editingUser.name}` : 'Add New Staff Member (නව සාමාජිකයා)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Full Staff Name (නම) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kasun Mendis"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        name,
                        username: prev.username || name.toLowerCase().replace(/\s+/g, '.'),
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Username */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Username (පිවිසුම් නාමය) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="kasun.sales"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Mobile / WhatsApp Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="0771234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="kasun@dsfurniture.lk"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* System Role */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Operational Role (භූමිකාව) *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.88rem',
                      }}
                    >
                      <option value="admin">👑 Store Owner / Super Admin</option>
                      <option value="sales_executive">💼 Sales & Showroom Exec</option>
                      <option value="cashier">💵 Cashier & Finance</option>
                      <option value="workshop_supervisor">🔨 Workshop & Carpentry Lead</option>
                      <option value="center_officer">🚚 Regional Distribution Officer</option>
                    </select>
                  </div>

                  {/* Assigned Hub / Center */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Assigned Center (මධ්‍යස්ථානය)
                    </label>
                    <select
                      value={`${formData.branch_code}/${formData.center_code}`}
                      onChange={(e) => {
                        const [branch, center] = e.target.value.split('/');
                        setFormData({
                          ...formData,
                          branch_code: branch,
                          center_code: center,
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.88rem',
                      }}
                    >
                      {centers.map((c) => (
                        <option key={c.id} value={`${c.branch_code}/${formatCenterCode(c.center_code)}`}>
                          {c.branch_code} / {formatCenterCode(c.center_code)} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--ash-50)', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, display: 'block', color: 'var(--text-main)' }}>
                      Account Status
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Allow login and operations for this member
                    </span>
                  </div>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    <option value="active">Active (ක්‍රියාකාරී)</option>
                    <option value="inactive">Suspended (අක්‍රියයි)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsUserModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update Staff Member' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL: CUSTOM PAGE PERMISSION CONFIGURATOR
          ========================================================== */}
      {isPermsModalOpen && userForPerms && (
        <div className="modal-overlay" onClick={() => setIsPermsModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '780px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                  Configure Page Access: {userForPerms.name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Role: {ROLES_METADATA[userForPerms.role]?.label} • Username: @{userForPerms.username}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPermsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Actions & Mode Switch */}
            <div
              style={{
                padding: '12px 20px',
                background: 'var(--ash-50)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={useCustomPerms}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setUseCustomPerms(enabled);
                      if (!enabled) {
                        setTempCustomPerms([...(rolePermissions[userForPerms.role] || [])]);
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span>Enable Custom Page Overrides for this User</span>
                </label>
                {!useCustomPerms && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--ash-200)', padding: '2px 8px', borderRadius: '4px' }}>
                    Currently using {ROLES_METADATA[userForPerms.role]?.shortLabel} presets
                  </span>
                )}
              </div>

              {useCustomPerms && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={() => setTempCustomPerms(SYSTEM_MODULES.map((m) => m.id))}
                  >
                    Select All (21)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={() => setTempCustomPerms(['dashboard'])}
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={() => setTempCustomPerms([...(rolePermissions[userForPerms.role] || [])])}
                  >
                    Reset to Role Default
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable Checklist */}
            <div
              className="modal-body"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--primary-tint)',
                  border: '1px solid var(--primary-border)',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Active Allowed Pages: {tempCustomPerms.length} / 21 Modules
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Restricted Pages: {21 - tempCustomPerms.length} Modules
                </span>
              </div>

              {Object.entries(modulesByCategory).map(([category, modules]) => (
                <div
                  key={category}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--ash-50)',
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{category}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {modules.filter((m) => tempCustomPerms.includes(m.id)).length} of {modules.length} allowed
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', padding: '12px' }}>
                    {modules.map((mod) => {
                      const isChecked = tempCustomPerms.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => handleToggleModuleInModal(mod.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border-subtle)'}`,
                            background: isChecked ? 'var(--primary-tint)' : 'var(--card-bg)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by card click
                            style={{ marginTop: '3px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
                              {mod.label}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                              {mod.description}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {useCustomPerms ? 'Custom overrides will replace role defaults for this member.' : 'Member will follow standard role changes.'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsPermsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveUserPermissions}
                >
                  <Save size={16} />
                  <span>Save Permissions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL: DELETE CONFIRMATION
          ========================================================== */}
      {deleteConfirmUser && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmUser(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '440px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--error)' }}>
                Confirm Staff Removal
              </h3>
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                Are you sure you want to remove <strong>{deleteConfirmUser.name}</strong> (@{deleteConfirmUser.username}) from the system?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                This user will no longer be able to log in or simulate sessions. Historical sales records tied to their username will remain preserved.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteConfirmUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--error)', color: '#fff', border: 'none' }}
                onClick={handleConfirmDelete}
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
