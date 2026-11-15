import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  EyeOff,
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
  Camera,
  Upload,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Printer,
  Sparkles,
  ExternalLink,
  Shield,
  Key,
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
  ROLES_METADATA,
} from '../utils/rolesData';
import {
  loadSavedAccounts,
  saveAccountsToStorage,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  calculateAgeFromDob,
  compressImageFile,
} from '../utils/authData';
import {
  extractDobFromNic,
  validateNic,
  validatePhone,
  sanitizeNicInput,
  sanitizePhoneInput,
} from '../utils/validators';
import { loadSavedCenters, formatCenterCode } from '../utils/centersData';

// Color Palette for Role Accents
const ROLE_COLORS = [
  { name: 'Purple (Admin)', hex: '#9333EA', bg: 'rgba(147, 51, 234, 0.14)', border: 'rgba(147, 51, 234, 0.35)' },
  { name: 'Royal Blue (Exec)', hex: '#2563EB', bg: 'rgba(37, 99, 235, 0.14)', border: 'rgba(37, 99, 235, 0.35)' },
  { name: 'Emerald (Cashier)', hex: '#059669', bg: 'rgba(5, 150, 105, 0.14)', border: 'rgba(5, 150, 105, 0.35)' },
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
  // Navigation tabs: 'users' (Staff User Accounts) | 'roles' (Roles & Permissions Matrix)
  const [activeSection, setActiveSection] = useState('users');

  // Accounts & Roles state
  const [accounts, setAccounts] = useState(() => loadSavedAccounts());
  const [roles, setRoles] = useState(() => loadAllRoles());
  const [centers] = useState(() => loadSavedCenters());

  // Active simulated role
  const [internalActiveRole, setInternalActiveRole] = useState(() => currentRole || currentUser?.role || getActiveRole());
  const activeRole = currentRole || currentUser?.role || internalActiveRole;

  // View modes
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards' | 'matrix'

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'executive' | 'cashier' | 'custom'
  const [statusFilter, setStatusFilter] = useState('all');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Listen to accounts updates across browser tabs / windows
  useEffect(() => {
    const handleAccountsUpdate = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setAccounts(e.detail);
      } else {
        setAccounts(loadSavedAccounts());
      }
    };
    window.addEventListener('dns_users_updated', handleAccountsUpdate);
    window.addEventListener('storage', handleAccountsUpdate);
    return () => {
      window.removeEventListener('dns_users_updated', handleAccountsUpdate);
      window.removeEventListener('storage', handleAccountsUpdate);
    };
  }, []);

  // Reload data
  const refreshAccounts = () => setAccounts(loadSavedAccounts());
  const refreshRoles = () => setRoles(loadAllRoles());

  // ==========================================================
  // USER MODAL STATES & FORM
  // ==========================================================
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserMode, setIsEditUserMode] = useState(false);
  const [isProfileOverviewOpen, setIsProfileOverviewOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // File input ref for photo
  const photoInputRef = useRef(null);

  // User Form State
  const [userFormData, setUserFormData] = useState({
    id: '',
    name: '',
    username: '',
    password: '',
    showPassword: false,
    role: 'cashier',
    nic: '',
    dob: '',
    age: '',
    gender: 'Male',
    photo: '',
    phone: '',
    email: '',
    assignedCenter: 'all',
    status: 'Active',
    customizePermissions: false,
    customPermissions: [],
  });

  const [userFormErrors, setUserFormErrors] = useState({});

  // ==========================================================
  // ROLE MODAL STATES & FORM (FOR ADVANCED ROLE MATRIX)
  // ==========================================================
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [isViewRoleModalOpen, setIsViewRoleModalOpen] = useState(false);
  const [isDeleteRoleModalOpen, setIsDeleteRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const [roleFormData, setRoleFormData] = useState({
    id: '',
    name: '',
    name_si: '',
    shortLabel: '',
    description: '',
    color: '#059669',
    permissions: [],
  });
  const [modalPermSearch, setModalPermSearch] = useState('');

  // ==========================================================
  // HANDLERS: USER CREATION & MANAGEMENT
  // ==========================================================

  // Open Create User Modal
  const handleOpenCreateUser = () => {
    setIsEditUserMode(false);
    setSelectedUser(null);
    const defaultRole = 'cashier';
    const matchedRole = roles.find((r) => r.id === defaultRole);
    const initialPerms = matchedRole?.permissions || DEFAULT_ROLE_PERMISSIONS.cashier || [];

    setUserFormData({
      id: '',
      name: '',
      username: '',
      password: '',
      showPassword: false,
      role: defaultRole,
      nic: '',
      dob: '',
      age: '',
      gender: 'Male',
      photo: '',
      phone: '',
      email: '',
      assignedCenter: centers[0] ? formatCenterCode(centers[0].code) : 'all',
      status: 'Active',
      customizePermissions: false,
      customPermissions: [...initialPerms],
    });
    setUserFormErrors({});
    setIsUserModalOpen(true);
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user) => {
    setIsEditUserMode(true);
    setSelectedUser(user);
    const matchedRole = roles.find((r) => r.id === user.role);
    const basePerms = user.customPermissions || matchedRole?.permissions || DEFAULT_ROLE_PERMISSIONS[user.role] || [];

    setUserFormData({
      id: user.id,
      name: user.name || '',
      username: user.username || '',
      password: user.password || '',
      showPassword: false,
      role: user.role || 'executive',
      nic: user.nic || '',
      dob: user.dob || '',
      age: user.age || (user.dob ? calculateAgeFromDob(user.dob) : ''),
      gender: user.gender || 'Male',
      photo: user.photo || '',
      phone: user.phone || '',
      email: user.email || '',
      assignedCenter: user.assignedCenter || 'all',
      status: user.status || 'Active',
      customizePermissions: Array.isArray(user.customPermissions) && user.customPermissions.length > 0,
      customPermissions: [...basePerms],
    });
    setUserFormErrors({});
    setIsUserModalOpen(true);
  };

  // Open Profile Overview Modal
  const handleOpenProfileOverview = (user) => {
    setSelectedUser(user);
    setIsProfileOverviewOpen(true);
  };

  // Open Delete User Confirmation Modal
  const handleOpenDeleteUser = (user) => {
    setSelectedUser(user);
    setIsDeleteUserModalOpen(true);
  };

  // Handle Photo Upload & Base64 Compression
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file);
        setUserFormData((prev) => ({ ...prev, photo: compressed }));
        showToast('Profile photo uploaded and optimized!');
      } catch (err) {
        showToast(err.message || 'Error processing photo.', 'error');
      }
    }
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    setUserFormData((prev) => ({ ...prev, photo: '' }));
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Handle NIC change: auto-extract Date of Birth and compute Age
  const handleNicChange = (nicVal) => {
    const sanitized = sanitizeNicInput(nicVal);
    const dobData = extractDobFromNic(sanitized);

    setUserFormData((prev) => {
      const updated = {
        ...prev,
        nic: sanitized,
      };

      if (dobData) {
        updated.dob = dobData.dob;
        updated.age = calculateAgeFromDob(dobData.dob);
        updated.gender = dobData.gender;
      }
      return updated;
    });

    if (userFormErrors.nic) {
      setUserFormErrors((prev) => ({ ...prev, nic: '' }));
    }
  };

  // Handle Manual DOB Change
  const handleDobChange = (dobVal) => {
    setUserFormData((prev) => ({
      ...prev,
      dob: dobVal,
      age: dobVal ? calculateAgeFromDob(dobVal) : '',
    }));
  };

  // Handle Role Selection
  const handleRoleSelect = (roleKey) => {
    const matchedRole = roles.find((r) => r.id === roleKey);
    const rolePerms = matchedRole?.permissions || DEFAULT_ROLE_PERMISSIONS[roleKey] || DEFAULT_ROLE_PERMISSIONS.executive;

    setUserFormData((prev) => ({
      ...prev,
      role: roleKey,
      customPermissions: [...rolePerms],
    }));
  };

  // Toggle single module in User's custom permissions
  const handleToggleUserModule = (moduleId) => {
    if (userFormData.role === 'admin') {
      showToast('Super Administrator has unconditional access to all modules.', 'error');
      return;
    }
    const exists = userFormData.customPermissions.includes(moduleId);
    const updated = exists
      ? userFormData.customPermissions.filter((id) => id !== moduleId)
      : [...userFormData.customPermissions, moduleId];

    setUserFormData((prev) => ({
      ...prev,
      customPermissions: updated,
      customizePermissions: true,
    }));
  };

  // Auto-generate username from name
  const handleAutoSuggestUsername = () => {
    if (!userFormData.name.trim()) return;
    const base = userFormData.name.trim().toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
    const rand = Math.floor(10 + Math.random() * 90);
    const suggested = `${base}${rand}`;
    setUserFormData((prev) => ({ ...prev, username: suggested }));
  };

  // Validate User Form
  const validateUserForm = () => {
    const errors = {};
    if (!userFormData.name.trim() || userFormData.name.trim().length < 2) {
      errors.name = 'Full Name is required (at least 2 characters).';
    }

    const cleanUsername = userFormData.username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      errors.username = 'Username is required (at least 3 characters, letters & numbers).';
    } else {
      // Check uniqueness
      const conflict = accounts.find(
        (a) => a.id !== userFormData.id && a.username && a.username.toLowerCase() === cleanUsername
      );
      if (conflict) {
        errors.username = `Username "${cleanUsername}" is already taken. Please choose another.`;
      }
    }

    if (!isEditUserMode && (!userFormData.password || userFormData.password.length < 4)) {
      errors.password = 'Password is required (at least 4 characters).';
    }

    if (userFormData.nic) {
      const nicCheck = validateNic(userFormData.nic, false);
      if (!nicCheck.isValid) {
        errors.nic = nicCheck.message;
      }
    }

    if (userFormData.phone) {
      const phoneCheck = validatePhone(userFormData.phone, false);
      if (!phoneCheck.isValid) {
        errors.phone = phoneCheck.message;
      }
    }

    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit User Create / Update
  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!validateUserForm()) {
      showToast('Please correct the errors in the form.', 'error');
      return;
    }

    const payload = {
      name: userFormData.name.trim(),
      username: userFormData.username.trim().toLowerCase(),
      role: userFormData.role,
      nic: userFormData.nic.trim().toUpperCase(),
      dob: userFormData.dob,
      age: userFormData.age !== '' ? Number(userFormData.age) : null,
      gender: userFormData.gender,
      photo: userFormData.photo,
      phone: userFormData.phone.trim(),
      email: userFormData.email.trim() || `${userFormData.username.trim().toLowerCase()}@dnshomesolutions.lk`,
      assignedCenter: userFormData.assignedCenter,
      status: userFormData.status,
      customPermissions: userFormData.customizePermissions ? userFormData.customPermissions : null,
    };

    if (userFormData.password) {
      payload.password = userFormData.password;
    }

    if (isEditUserMode) {
      const res = updateUserAccount(userFormData.id, payload);
      if (res.success) {
        refreshAccounts();
        setIsUserModalOpen(false);
        showToast(`Staff member "${payload.name}" updated successfully!`);
      } else {
        showToast(res.error || 'Failed to update staff member.', 'error');
      }
    } else {
      const res = createUserAccount(payload);
      if (res.success) {
        refreshAccounts();
        setIsUserModalOpen(false);
        showToast(`Staff account for "${payload.name}" created! Username: @${payload.username}`);
      } else {
        showToast(res.error || 'Failed to create staff account.', 'error');
      }
    }
  };

  // Confirm Delete User
  const handleConfirmDeleteUser = () => {
    if (!selectedUser) return;
    const res = deleteUserAccount(selectedUser.id, currentUser?.id);
    if (res.success) {
      refreshAccounts();
      setIsDeleteUserModalOpen(false);
      showToast(`Staff account "${selectedUser.name}" deleted.`);
    } else {
      showToast(res.error || 'Cannot delete account.', 'error');
    }
  };

  // Quick switch simulated session to this user
  const handleSimulateUserSession = (user) => {
    setActiveRole(user.role);
    if (onRoleChange) {
      onRoleChange(user.role);
    }
    if (onUserChange) {
      onUserChange(user);
    }
    try {
      localStorage.setItem('dns_session_user', JSON.stringify(user));
      localStorage.setItem('dnd_active_role', user.role);
    } catch (e) {
      console.error(e);
    }
    setIsProfileOverviewOpen(false);
    showToast(`Logged in as @${user.username} (${user.role.toUpperCase()})`);
  };

  // Quick reset password by Admin
  const handleQuickResetPassword = (user) => {
    const newPass = prompt(`Enter new password for @${user.username}:`, 'pass1234');
    if (newPass && newPass.trim().length >= 4) {
      updateUserAccount(user.id, { password: newPass.trim() });
      refreshAccounts();
      showToast(`Password for @${user.username} updated to "${newPass.trim()}".`);
    } else if (newPass !== null) {
      showToast('Password must be at least 4 characters long.', 'error');
    }
  };

  // Print Staff ID / Overview Card
  const handlePrintProfile = () => {
    window.print();
  };

  // ==========================================================
  // ROLE ACCENTS & HELPERS
  // ==========================================================
  const getRoleBadgeStyle = (roleKey) => {
    switch (roleKey) {
      case 'admin':
        return {
          bg: 'rgba(147, 51, 234, 0.12)',
          color: '#9333EA',
          border: '1px solid rgba(147, 51, 234, 0.3)',
          label: '👑 Administrator',
        };
      case 'cashier':
        return {
          bg: 'rgba(5, 150, 105, 0.12)',
          color: '#059669',
          border: '1px solid rgba(5, 150, 105, 0.3)',
          label: '💵 Showroom Cashier',
        };
      case 'executive':
      default:
        return {
          bg: 'rgba(37, 99, 235, 0.12)',
          color: '#2563EB',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          label: '💼 Executive Staff',
        };
    }
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

  // Filtered Accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.name?.toLowerCase().includes(q) ||
        a.username?.toLowerCase().includes(q) ||
        a.nic?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.role?.toLowerCase().includes(q) ||
        a.assignedCenter?.toLowerCase().includes(q);

      const matchRole =
        roleFilter === 'all'
          ? true
          : a.role === roleFilter;

      const matchStatus =
        statusFilter === 'all'
          ? true
          : a.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, searchQuery, roleFilter, statusFilter]);

  // Filtered Roles list (for Roles tab)
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.shortLabel?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    });
  }, [roles, searchQuery]);

  // Compute active permitted modules for modal role preview
  const currentModalPermittedModules = useMemo(() => {
    if (userFormData.role === 'admin') {
      return SYSTEM_MODULES.map((m) => m.id);
    }
    if (userFormData.customizePermissions && Array.isArray(userFormData.customPermissions)) {
      return userFormData.customPermissions;
    }
    const matched = roles.find((r) => r.id === userFormData.role);
    return matched?.permissions || DEFAULT_ROLE_PERMISSIONS[userFormData.role] || DEFAULT_ROLE_PERMISSIONS.executive;
  }, [userFormData.role, userFormData.customizePermissions, userFormData.customPermissions, roles]);

  // Export JSON
  const handleExportData = () => {
    const backupObj = {
      exported_at: new Date().toISOString(),
      staff_accounts: accounts,
      system_roles: roles,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `dns_staff_and_roles_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Staff and roles data exported successfully.');
  };

  return (
    <div className="users-page-container" style={{ paddingBottom: '40px' }}>
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
          TOP SECTION SWITCHER TABS: STAFF ACCOUNTS vs SYSTEM ROLES
          ========================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          borderBottom: '1.5px solid var(--border-subtle)',
          paddingBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSection('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeSection === 'users' ? 'var(--primary)' : 'var(--card-bg)',
            color: activeSection === 'users' ? '#FFFFFF' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: activeSection === 'users' ? '0 4px 14px rgba(30,77,140,0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={17} />
          <span>Staff User Accounts ({accounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeSection === 'roles' ? 'var(--primary)' : 'var(--card-bg)',
            color: activeSection === 'roles' ? '#FFFFFF' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: activeSection === 'roles' ? '0 4px 14px rgba(30,77,140,0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <ShieldCheck size={17} />
          <span>Roles & Module Privileges ({roles.length})</span>
        </button>
      </div>

      {/* ==========================================================
          1. STAT CARDS ROW (KPI OVERVIEW)
          ========================================================== */}
      <div className="stats-grid">
        <StatCard
          title="Total Staff Users"
          value={`${accounts.length} Members`}
          subtitle={`${accounts.filter((a) => a.status === 'Active').length} Active • ${accounts.filter((a) => a.status !== 'Active').length} Inactive`}
          icon={Users}
          color="#2563EB"
          bg="rgba(37, 99, 235, 0.12)"
        />
        <StatCard
          title="Showroom Cashiers"
          value={`${accounts.filter((a) => a.role === 'cashier').length} Cashiers`}
          subtitle="Collections & Cashbook Desk"
          icon={CreditCard}
          color="#059669"
          bg="rgba(5, 150, 105, 0.12)"
        />
        <StatCard
          title="Executive Officers"
          value={`${accounts.filter((a) => a.role === 'executive').length} Executives`}
          subtitle="Sales, Orders & Customer Loans"
          icon={Briefcase}
          color="#D97706"
          bg="rgba(217, 119, 6, 0.12)"
        />
        <StatCard
          title="Super Administrators"
          value={`${accounts.filter((a) => a.role === 'admin').length} Admins`}
          subtitle="Full System Clearance (All 21 Pages)"
          icon={Crown}
          color="#9333EA"
          bg="rgba(147, 51, 234, 0.12)"
        />
      </div>

      {/* ==========================================================
          2. FILTER & ACTION TOOLBAR
          ========================================================== */}
      <div className="filter-card">
        {/* Row 1: Search Box + Action Buttons */}
        <div className="filter-row-top">
          <div className="filter-search-box">
            <Search className="filter-search-icon" size={17} />
            <input
              type="text"
              className="filter-search-input"
              placeholder={
                activeSection === 'users'
                  ? 'Search staff by name, @username, NIC, role, center...'
                  : 'Search roles by name or description...'
              }
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
              {activeSection === 'roles' && (
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === 'matrix' ? 'active' : ''}`}
                  onClick={() => setViewMode('matrix')}
                >
                  Matrix
                </button>
              )}
            </div>

            {/* Export JSON Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportData}
              style={{ padding: '9px 14px', fontSize: '0.84rem', gap: '6px' }}
              title="Export staff & roles catalog"
            >
              <Download size={15} /> Export
            </button>

            {/* Primary Action Button: Create Staff User / Create Role */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateUser}
              style={{ padding: '9px 16px', fontSize: '0.86rem', gap: '6px', fontWeight: 700 }}
            >
              <Plus size={16} /> + Create Staff User
            </button>
          </div>
        </div>

        {/* Row 2: Role filter chips */}
        <div
          className="filter-row-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
          <button
            type="button"
            className={`filter-chip-btn ${roleFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRoleFilter('all')}
          >
            All Roles
          </button>
          <button
            type="button"
            className={`filter-chip-btn ${roleFilter === 'cashier' ? 'active' : ''}`}
            onClick={() => setRoleFilter('cashier')}
          >
            💵 Cashiers ({accounts.filter((a) => a.role === 'cashier').length})
          </button>
          <button
            type="button"
            className={`filter-chip-btn ${roleFilter === 'executive' ? 'active' : ''}`}
            onClick={() => setRoleFilter('executive')}
          >
            💼 Executives ({accounts.filter((a) => a.role === 'executive').length})
          </button>
          <button
            type="button"
            className={`filter-chip-btn ${roleFilter === 'admin' ? 'active' : ''}`}
            onClick={() => setRoleFilter('admin')}
          >
            👑 Administrators ({accounts.filter((a) => a.role === 'admin').length})
          </button>

          {(searchQuery || roleFilter !== 'all') && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
              }}
              style={{ padding: '4px 10px', fontSize: '0.75rem', marginLeft: 'auto', gap: '4px' }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ==========================================================
          SECTION 1: STAFF USER ACCOUNTS (MAIN VIEW)
          ========================================================== */}
      {activeSection === 'users' && (
        <>
          {viewMode === 'table' ? (
            <div className="table-responsive card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--ash-100)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700 }}>Staff Member</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700 }}>Role & Permissions</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700 }}>NIC & Age</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700 }}>Date of Birth</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700 }}>Phone / Center</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                        <User size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                        <div style={{ fontWeight: 600 }}>No staff accounts match your search.</div>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={handleOpenCreateUser}
                          style={{ marginTop: '12px', fontSize: '0.82rem' }}
                        >
                          + Create New Staff Account
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((user) => {
                      const roleStyle = getRoleBadgeStyle(user.role);
                      return (
                        <tr
                          key={user.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background 0.15s ease',
                          }}
                          className="table-row-hover"
                        >
                          {/* Staff Member (Photo + Name + Username) */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {user.photo ? (
                                <img
                                  src={user.photo}
                                  alt={user.name}
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid var(--border-subtle)',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    background: roleStyle.bg,
                                    color: roleStyle.color,
                                    border: roleStyle.border,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                  }}
                                >
                                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                                </div>
                              )}
                              <div>
                                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                  {user.name}
                                </strong>
                                <span
                                  style={{
                                    fontSize: '0.74rem',
                                    color: 'var(--primary)',
                                    fontWeight: 600,
                                  }}
                                >
                                  @{user.username || 'staff'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background: roleStyle.bg,
                                color: roleStyle.color,
                                border: roleStyle.border,
                              }}
                            >
                              {roleStyle.label}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {user.role === 'admin'
                                ? 'Full Clearance (21 Pages)'
                                : user.role === 'cashier'
                                ? 'Cash Desk, Payments & Sheets'
                                : 'Operational Clearance'}
                            </div>
                          </td>

                          {/* NIC & Age */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {user.nic || '—'}
                            </div>
                            {user.age !== undefined && user.age !== null && user.age !== '' ? (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background: 'rgba(37, 99, 235, 0.1)',
                                  color: '#2563EB',
                                  fontWeight: 700,
                                }}
                              >
                                {user.age} Yrs Old
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Age N/A</span>
                            )}
                          </td>

                          {/* Date of Birth */}
                          <td style={{ padding: '12px 16px', fontSize: '0.84rem', color: 'var(--text-main)' }}>
                            {user.dob ? (
                              <div>
                                <span>{user.dob}</span>
                                {user.gender && user.gender !== 'Not Specified' && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                                    {user.gender}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* Phone / Center */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                              {user.phone || '—'}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              🏢 {user.assignedCenter === 'all' ? 'All Showrooms' : user.assignedCenter}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: user.status === 'Active' ? 'rgba(5, 150, 105, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                                color: user.status === 'Active' ? '#059669' : '#EF4444',
                              }}
                            >
                              {user.status || 'Active'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {/* Overview Button */}
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => handleOpenProfileOverview(user)}
                                title="View User Profile Overview"
                                style={{ padding: '6px 9px', borderRadius: '6px' }}
                              >
                                <Eye size={15} />
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => handleOpenEditUser(user)}
                                title="Edit Staff Details"
                                style={{ padding: '6px 9px', borderRadius: '6px' }}
                              >
                                <Edit2 size={15} />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => handleOpenDeleteUser(user)}
                                title="Delete Staff Account"
                                style={{ padding: '6px 9px', borderRadius: '6px', color: 'var(--error)' }}
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
          ) : (
            /* Cards View */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filteredAccounts.map((user) => {
                const roleStyle = getRoleBadgeStyle(user.role);
                return (
                  <div
                    key={user.id}
                    className="card"
                    style={{
                      padding: '20px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {user.photo ? (
                        <img
                          src={user.photo}
                          alt={user.name}
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `2px solid ${roleStyle.color}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: roleStyle.bg,
                            color: roleStyle.color,
                            border: roleStyle.border,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.2rem',
                          }}
                        >
                          {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>{user.name}</h4>
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                          @{user.username || 'staff'}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '4px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: roleStyle.bg,
                            color: roleStyle.color,
                            border: roleStyle.border,
                          }}
                        >
                          {roleStyle.label}
                        </span>
                      </div>
                    </div>

                    <div style={{ background: 'var(--ash-50)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>NIC:</span>
                        <strong>{user.nic || '—'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>DOB / Age:</span>
                        <strong>{user.dob ? `${user.dob} (${user.age || '—'} Yrs)` : '—'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                        <strong>{user.phone || '—'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Center:</span>
                        <strong>{user.assignedCenter === 'all' ? 'All Showrooms' : user.assignedCenter}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ flex: 1, padding: '7px', fontSize: '0.78rem', gap: '4px' }}
                        onClick={() => handleOpenProfileOverview(user)}
                      >
                        <Eye size={14} /> Overview
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '7px', fontSize: '0.78rem' }}
                        onClick={() => handleOpenEditUser(user)}
                        title="Edit User"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '7px', fontSize: '0.78rem', color: 'var(--error)' }}
                        onClick={() => handleOpenDeleteUser(user)}
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==========================================================
          SECTION 2: ROLES & MODULE PRIVILEGES MATRIX
          ========================================================== */}
      {activeSection === 'roles' && (
        <div>
          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Organizational Roles & Access Control</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                System roles determine page visibility and operational boundaries across the enterprise.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateUser}
              style={{ fontSize: '0.84rem' }}
            >
              <Plus size={15} /> + Create Role / Staff
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredRoles.map((role) => {
              return (
                <div
                  key={role.id}
                  className="card"
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: `1.5px solid ${role.border || 'var(--border-subtle)'}`,
                    background: 'var(--card-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: role.bg || 'var(--ash-100)',
                        color: role.color || '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {role.id === 'admin' ? <Crown size={22} /> : role.id === 'cashier' ? <CreditCard size={22} /> : <Briefcase size={22} />}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{role.name}</h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Code: <strong>{role.shortLabel}</strong> • {role.permissions.length} Pages Allowed
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {role.description}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {role.isSystem ? '🔒 Core System Role' : '⚙️ Custom Role'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      onClick={() => {
                        setSelectedRole(role);
                        setIsViewRoleModalOpen(true);
                      }}
                    >
                      View Privileges
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 1: CREATE / EDIT STAFF USER & ROLE ASSIGNMENT
          (REQUESTED RICH MODAL: IMAGE, ROLE, NAME, NIC, AUTO-DOB,
           AUTO-AGE, USERNAME & PASSWORD, AND ACCESSIBLE PAGES)
          ========================================================== */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={isEditUserMode ? `Edit Staff Account: ${userFormData.name}` : 'Create Staff Member & Assign Role'}
      >
        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* SECTION 1: PROFILE PHOTO & BASIC DETAILS */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--ash-50)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
            }}
          >
            {/* Circular Photo Preview */}
            <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
              {userFormData.photo ? (
                <img
                  src={userFormData.photo}
                  alt="Staff Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--primary)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'var(--ash-200)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    border: '2px dashed var(--border-subtle)',
                  }}
                >
                  <User size={38} />
                </div>
              )}
            </div>

            {/* Photo Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                User Profile Photo
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Upload employee face picture (JPG, PNG, WebP). Optimized & saved automatically.
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => photoInputRef.current?.click()}
                  style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px' }}
                >
                  <Camera size={14} />
                  {userFormData.photo ? 'Change Photo' : 'Upload Staff Photo'}
                </button>
                {userFormData.photo && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleRemovePhoto}
                    style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--error)' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: ROLE SELECTION & ACCESSIBLE PAGES */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)' }}>
              Assigned System Role *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => handleRoleSelect('cashier')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: userFormData.role === 'cashier' ? '2px solid #059669' : '1px solid var(--border-subtle)',
                  background: userFormData.role === 'cashier' ? 'rgba(5, 150, 105, 0.12)' : 'var(--card-bg)',
                  color: userFormData.role === 'cashier' ? '#059669' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} /> Cashier
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '2px' }}>
                  Desk & Field Cash
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('executive')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: userFormData.role === 'executive' ? '2px solid #2563EB' : '1px solid var(--border-subtle)',
                  background: userFormData.role === 'executive' ? 'rgba(37, 99, 235, 0.12)' : 'var(--card-bg)',
                  color: userFormData.role === 'executive' ? '#2563EB' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={15} /> Executive
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '2px' }}>
                  Showroom & Sales
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: userFormData.role === 'admin' ? '2px solid #9333EA' : '1px solid var(--border-subtle)',
                  background: userFormData.role === 'admin' ? 'rgba(147, 51, 234, 0.12)' : 'var(--card-bg)',
                  color: userFormData.role === 'admin' ? '#9333EA' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Crown size={15} /> Administrator
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '2px' }}>
                  Full Clearance (100%)
                </div>
              </button>
            </div>

            {/* ACCESSIBLE PAGES VIEWER ("access karanna puluwn pages wenma view karanna") */}
            <div style={{ background: 'var(--ash-50)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  📋 Permitted Pages for this Role ({currentModalPermittedModules.length} of {SYSTEM_MODULES.length} Accessible):
                </span>
                {userFormData.role !== 'admin' && (
                  <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: 'var(--primary)' }}>
                    <input
                      type="checkbox"
                      checked={userFormData.customizePermissions}
                      onChange={(e) => setUserFormData((prev) => ({ ...prev, customizePermissions: e.target.checked }))}
                    />
                    <span>Customize Access</span>
                  </label>
                )}
              </div>

              {/* Module badges grid */}
              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {SYSTEM_MODULES.map((mod) => {
                  const isPermitted = currentModalPermittedModules.includes(mod.id);
                  return (
                    <label
                      key={mod.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isPermitted ? 'rgba(5, 150, 105, 0.08)' : 'var(--ash-100)',
                        border: `1px solid ${isPermitted ? 'rgba(5, 150, 105, 0.25)' : 'var(--border-subtle)'}`,
                        fontSize: '0.74rem',
                        cursor: userFormData.customizePermissions && userFormData.role !== 'admin' ? 'pointer' : 'default',
                        color: isPermitted ? '#059669' : 'var(--text-muted)',
                      }}
                    >
                      {userFormData.customizePermissions && userFormData.role !== 'admin' ? (
                        <input
                          type="checkbox"
                          checked={isPermitted}
                          onChange={() => handleToggleUserModule(mod.id)}
                          style={{ accentColor: '#059669' }}
                        />
                      ) : isPermitted ? (
                        <Check size={12} strokeWidth={3} />
                      ) : (
                        <Lock size={11} />
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mod.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 3: PERSONAL DETAILS (NAME, NIC, AUTO-DOB, AUTO-AGE, PHONE, CENTER) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Kasun Perera"
                value={userFormData.name}
                onChange={(e) => {
                  setUserFormData({ ...userFormData, name: e.target.value });
                  if (userFormErrors.name) setUserFormErrors({ ...userFormErrors, name: '' });
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${userFormErrors.name ? 'var(--error)' : 'var(--border-subtle)'}`,
                  background: 'var(--card-bg)',
                  fontSize: '0.86rem',
                }}
              />
              {userFormErrors.name && (
                <span style={{ fontSize: '0.7rem', color: 'var(--error)', marginTop: '2px', display: 'block' }}>
                  {userFormErrors.name}
                </span>
              )}
            </div>

            {/* NIC (National Identity Card) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  NIC Number *
                </label>
                {userFormData.nic && (
                  <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                    {userFormData.nic.length === 12 ? '✓ 12-Digit New' : '✓ 10-Char Old'}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. 200127502100 or 851234567V"
                value={userFormData.nic}
                onChange={(e) => handleNicChange(e.target.value)}
                maxLength={12}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${userFormErrors.nic ? 'var(--error)' : 'var(--border-subtle)'}`,
                  background: 'var(--card-bg)',
                  fontSize: '0.86rem',
                }}
              />
              {userFormErrors.nic && (
                <span style={{ fontSize: '0.7rem', color: 'var(--error)', marginTop: '2px', display: 'block' }}>
                  {userFormErrors.nic}
                </span>
              )}
            </div>

            {/* Date of Birth (DOB) - Auto-generated from NIC */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  Date of Birth (DOB)
                </label>
                {userFormData.dob && (
                  <span style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: 700 }}>
                    ⚡ Auto from NIC
                  </span>
                )}
              </div>
              <input
                type="date"
                value={userFormData.dob}
                onChange={(e) => handleDobChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  background: 'var(--card-bg)',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            {/* Age (Auto-generated from DOB) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                Age (Years)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  readOnly
                  placeholder="Auto-calculated from DOB"
                  value={userFormData.age !== '' && userFormData.age !== null ? `${userFormData.age} Years Old` : ''}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle)',
                    background: 'var(--ash-100)',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: userFormData.age ? '#2563EB' : 'var(--text-muted)',
                  }}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                Phone Number
              </label>
              <input
                type="text"
                placeholder="07XXXXXXXX"
                value={userFormData.phone}
                onChange={(e) => setUserFormData({ ...userFormData, phone: sanitizePhoneInput(e.target.value) })}
                maxLength={10}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1.5px solid ${userFormErrors.phone ? 'var(--error)' : 'var(--border-subtle)'}`,
                  background: 'var(--card-bg)',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            {/* Assigned Center */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                Assigned Center / Branch
              </label>
              <select
                value={userFormData.assignedCenter}
                onChange={(e) => setUserFormData({ ...userFormData, assignedCenter: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  background: 'var(--card-bg)',
                  fontSize: '0.86rem',
                }}
              >
                <option value="all">🏢 All Showrooms / Head Office</option>
                {centers.map((c) => (
                  <option key={c.code} value={formatCenterCode(c.code)}>
                    {formatCenterCode(c.code)} — {c.location || c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 4: LOGIN CREDENTIALS (USERNAME & PASSWORD CREATED BY ADMIN) */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(30, 77, 140, 0.05)',
              border: '1.5px solid rgba(30, 77, 140, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <Key size={17} />
              <strong style={{ fontSize: '0.88rem' }}>Admin-Assigned System Login Credentials</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              The staff member will use these credentials to sign in at the official portal.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Username */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    Username *
                  </label>
                  {!isEditUserMode && (
                    <button
                      type="button"
                      onClick={handleAutoSuggestUsername}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Suggest
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. cashier01 or deshan"
                  value={userFormData.username}
                  onChange={(e) => {
                    setUserFormData({ ...userFormData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') });
                    if (userFormErrors.username) setUserFormErrors({ ...userFormErrors, username: '' });
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1.5px solid ${userFormErrors.username ? 'var(--error)' : 'var(--border-subtle)'}`,
                    background: 'var(--card-bg)',
                    fontSize: '0.86rem',
                  }}
                />
                {userFormErrors.username && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--error)', marginTop: '2px', display: 'block' }}>
                    {userFormErrors.username}
                  </span>
                )}
              </div>

              {/* Password with Reveal Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                  {isEditUserMode ? 'Password (Leave blank to keep existing)' : 'Password *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={userFormData.showPassword ? 'text' : 'password'}
                    placeholder={isEditUserMode ? '••••••••' : 'Enter password'}
                    value={userFormData.password}
                    onChange={(e) => {
                      setUserFormData({ ...userFormData, password: e.target.value });
                      if (userFormErrors.password) setUserFormErrors({ ...userFormErrors, password: '' });
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 36px 9px 12px',
                      borderRadius: '8px',
                      border: `1.5px solid ${userFormErrors.password ? 'var(--error)' : 'var(--border-subtle)'}`,
                      background: 'var(--card-bg)',
                      fontSize: '0.86rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setUserFormData((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {userFormData.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {userFormErrors.password && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--error)', marginTop: '2px', display: 'block' }}>
                    {userFormErrors.password}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setIsUserModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ fontWeight: 700, padding: '10px 20px' }}>
              {isEditUserMode ? 'Save Staff Changes' : '+ Create Staff Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================================
          MODAL 2: USER PROFILE OVERVIEW (REQUESTED DEDICATED OVERVIEW)
          ("eh user profile eka wenama view wenna ona as a overview")
          ========================================================== */}
      <Modal
        isOpen={isProfileOverviewOpen}
        onClose={() => setIsProfileOverviewOpen(false)}
        title="Staff Profile & Security Overview"
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* HERO PROFILE CARD */}
            <div
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(30,77,140,0.1) 0%, rgba(30,77,140,0.02) 100%)',
                border: '1.5px solid rgba(30,77,140,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
              }}
            >
              {selectedUser.photo ? (
                <img
                  src={selectedUser.photo}
                  alt={selectedUser.name}
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--primary)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    background: getRoleBadgeStyle(selectedUser.role).bg,
                    color: getRoleBadgeStyle(selectedUser.role).color,
                    border: getRoleBadgeStyle(selectedUser.role).border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.8rem',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                  }}
                >
                  {selectedUser.name ? selectedUser.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
              )}

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                    {selectedUser.name}
                  </h3>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: selectedUser.status === 'Active' ? 'rgba(5, 150, 105, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                      color: selectedUser.status === 'Active' ? '#059669' : '#EF4444',
                    }}
                  >
                    ● {selectedUser.status || 'Active'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--primary)', fontWeight: 700 }}>
                    @{selectedUser.username || 'staff'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>•</span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: getRoleBadgeStyle(selectedUser.role).bg,
                      color: getRoleBadgeStyle(selectedUser.role).color,
                    }}
                  >
                    {getRoleBadgeStyle(selectedUser.role).label}
                  </span>
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  🏢 Assigned: <strong>{selectedUser.assignedCenter === 'all' ? 'All Showrooms / Head Office' : selectedUser.assignedCenter}</strong>
                </div>
              </div>
            </div>

            {/* DETAILS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  National Identity Card (NIC)
                </span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                  {selectedUser.nic || 'Not Recorded'}
                </strong>
              </div>

              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Date of Birth & Age
                </span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                  {selectedUser.dob ? `${selectedUser.dob} (${selectedUser.age || '—'} Years)` : 'Not Recorded'}
                </strong>
              </div>

              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Contact Phone
                </span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                  {selectedUser.phone || 'Not Recorded'}
                </strong>
              </div>

              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Corporate Email
                </span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                  {selectedUser.email || `${selectedUser.username}@dnshomesolutions.lk`}
                </strong>
              </div>
            </div>

            {/* ACCESSIBLE PAGES / PRIVILEGES BREAKDOWN */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.86rem' }}>
                  Permitted System Pages & Capabilities
                </strong>
                <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
                  {selectedUser.role === 'admin'
                    ? '21 of 21 Pages (100% Access)'
                    : `${(selectedUser.customPermissions || DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || []).length} of 21 Pages Accessible`}
                </span>
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {SYSTEM_MODULES.map((mod) => {
                    const isAllowed =
                      selectedUser.role === 'admin' ||
                      (selectedUser.customPermissions
                        ? selectedUser.customPermissions.includes(mod.id)
                        : (DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || []).includes(mod.id));

                    return (
                      <div
                        key={mod.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: isAllowed ? 'rgba(5, 150, 105, 0.08)' : 'var(--ash-50)',
                          color: isAllowed ? '#059669' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          border: `1px solid ${isAllowed ? 'rgba(5, 150, 105, 0.2)' : 'transparent'}`,
                        }}
                      >
                        {isAllowed ? <Check size={13} strokeWidth={3} /> : <Lock size={12} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mod.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleQuickResetPassword(selectedUser)}
                style={{ fontSize: '0.78rem', gap: '4px' }}
              >
                <Key size={13} /> Reset Password
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleSimulateUserSession(selectedUser)}
                  style={{ fontSize: '0.8rem', gap: '4px' }}
                >
                  <Sparkles size={14} /> Simulate Login
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsProfileOverviewOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ==========================================================
          MODAL 3: DELETE USER CONFIRMATION MODAL
          ========================================================== */}
      <Modal
        isOpen={isDeleteUserModalOpen}
        onClose={() => setIsDeleteUserModalOpen(false)}
        title="Confirm User Account Deletion"
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete the staff account for <strong>"{selectedUser.name}"</strong> (@{selectedUser.username})?
              This user will no longer be able to log in to the furniture system.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsDeleteUserModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: 'var(--error)', color: '#FFFFFF', fontWeight: 600 }}
                onClick={handleConfirmDeleteUser}
              >
                Delete Account Permanently
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ==========================================================
          MODAL 4: VIEW ROLE PRIVILEGES MODAL (FOR ROLES TAB)
          ========================================================== */}
      <Modal
        isOpen={isViewRoleModalOpen}
        onClose={() => setIsViewRoleModalOpen(false)}
        title={`Role Breakdown: ${selectedRole?.name || ''}`}
      >
        {selectedRole && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                }}
              >
                {selectedRole.id === 'admin' ? <Crown size={24} /> : <Briefcase size={24} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{selectedRole.name}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {selectedRole.description}
                </p>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '0.84rem', display: 'block', marginBottom: '8px' }}>
                Permitted Pages ({selectedRole.permissions.length} of {SYSTEM_MODULES.length} Allowed)
              </strong>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {SYSTEM_MODULES.map((mod) => {
                    const isAllowed = selectedRole.permissions.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: isAllowed ? 'rgba(5, 150, 105, 0.08)' : 'var(--ash-50)',
                          color: isAllowed ? '#059669' : 'var(--text-muted)',
                          fontSize: '0.74rem',
                        }}
                      >
                        {isAllowed ? <Check size={12} strokeWidth={3} /> : <Lock size={11} />}
                        <span>{mod.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsViewRoleModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
