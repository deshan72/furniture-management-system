import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Crown,
  Briefcase,
  CheckCircle2,
  Lock,
  Save,
  RefreshCw,
  Search,
  Sliders,
  Check,
  AlertCircle,
  FileText,
  Boxes,
  Users,
  Building2,
  WalletCards,
  ShoppingCart,
  BarChart3,
  Settings,
} from 'lucide-react';
import {
  SYSTEM_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  loadRolePermissions,
  saveRolePermissions,
  getActiveRole,
  setActiveRole,
} from '../utils/rolesData';

export default function UsersPage({
  currentRole,
  onRoleChange,
  currentUser,
  onUserChange,
}) {
  // Saved permissions state: { admin: [...], executive: [...] }
  const [rolePermissions, setRolePermissions] = useState(() => loadRolePermissions());

  // Active simulated role: 'admin' | 'executive'
  const [activeRole, setActiveRoleState] = useState(() => currentRole || currentUser?.role || getActiveRole());

  // Currently inspected role tab: 'executive' (default for configuring) | 'admin'
  const [selectedRoleTab, setSelectedRoleTab] = useState('executive');

  // View style: 'cards' (interactive categorized cards) | 'matrix' (side-by-side table)
  const [viewStyle, setViewStyle] = useState('cards');

  // Search & Category Filter for modules
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Dirty tracker for unsaved changes
  const [isModified, setIsModified] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch Live Simulated Role (Admin vs Executive)
  const handleToggleLiveRole = (targetRole) => {
    setActiveRoleState(targetRole);
    setActiveRole(targetRole);
    if (onRoleChange) {
      onRoleChange(targetRole);
    }
    if (onUserChange) {
      onUserChange({
        id: targetRole === 'admin' ? 'usr_admin' : 'usr_exec',
        name: targetRole === 'admin' ? 'D&S Administrator' : 'Executive Staff',
        role: targetRole,
      });
    }
    showToast(
      targetRole === 'admin'
        ? 'Switched active view to: 👑 Administrator (Full Privileges)'
        : 'Switched active view to: 💼 Executive Staff (Operational Access)'
    );
  };

  // Executive allowed pages array
  const executiveAllowed = rolePermissions.executive || [];

  // Toggle single module for Executive role
  const handleToggleModule = (moduleId) => {
    if (selectedRoleTab === 'admin') {
      showToast('Administrator role has mandatory full access to all system modules.', 'error');
      return;
    }

    const exists = executiveAllowed.includes(moduleId);
    const updated = exists
      ? executiveAllowed.filter((id) => id !== moduleId)
      : [...executiveAllowed, moduleId];

    setRolePermissions((prev) => ({
      ...prev,
      executive: updated,
    }));
    setIsModified(true);
  };

  // Apply Quick Presets for Executive Role
  const handleApplyPreset = (presetKey) => {
    let newPerms = [];
    switch (presetKey) {
      case 'all':
        newPerms = SYSTEM_MODULES.map((m) => m.id);
        break;
      case 'none':
        newPerms = ['dashboard']; // Keep at least dashboard
        break;
      case 'sales_cashier':
        newPerms = ['dashboard', 'orders', 'payments', 'returns', 'products', 'customers', 'outstanding', 'cashbook'];
        break;
      case 'workshop_stock':
        newPerms = ['dashboard', 'products', 'categories', 'stock', 'low-stock', 'returns', 'purchases'];
        break;
      case 'standard':
      default:
        newPerms = [...DEFAULT_ROLE_PERMISSIONS.executive];
        break;
    }

    setRolePermissions((prev) => ({
      ...prev,
      executive: newPerms,
    }));
    setIsModified(true);
    showToast(`Applied preset for Executive Role (${newPerms.length} pages enabled).`);
  };

  // Save changes to localStorage
  const handleSave = () => {
    saveRolePermissions(rolePermissions);
    setIsModified(false);
    showToast('Role permissions successfully saved & applied across the system!');
    if (onRoleChange) {
      onRoleChange(activeRole);
    }
  };

  // Reset to Factory Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset role permissions to system factory defaults?')) {
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      saveRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      setIsModified(false);
      showToast('Permissions reset to initial factory presets.');
      if (onRoleChange) {
        onRoleChange(activeRole);
      }
    }
  };

  // Filter modules based on search and category
  const filteredModules = useMemo(() => {
    return SYSTEM_MODULES.filter((mod) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        mod.label.toLowerCase().includes(q) ||
        mod.label_si.includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.category.toLowerCase().includes(q);

      const matchCategory = categoryFilter === 'all' || mod.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [searchQuery, categoryFilter]);

  // Group filtered modules by Category
  const modulesByCategory = useMemo(() => {
    const map = {};
    filteredModules.forEach((m) => {
      if (!map[m.category]) {
        map[m.category] = [];
      }
      map[m.category].push(m);
    });
    return map;
  }, [filteredModules]);

  // Categories list
  const categoriesList = useMemo(() => {
    return Array.from(new Set(SYSTEM_MODULES.map((m) => m.category)));
  }, []);

  // Icon getter for category
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
        return <ShieldCheck size={15} />;
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

  return (
    <div className="users-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
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
          }}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ==========================================================
          1. LIVE SYSTEM ROLE SIMULATOR BANNER
          ========================================================== */}
      <div
        className="persona-simulator-banner"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--ash-50) 100%)',
          border: '1.5px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '18px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: activeRole === 'admin' ? 'rgba(147, 51, 234, 0.15)' : 'rgba(37, 99, 235, 0.15)',
              color: activeRole === 'admin' ? '#9333EA' : '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1.5px solid ${activeRole === 'admin' ? 'rgba(147, 51, 234, 0.3)' : 'rgba(37, 99, 235, 0.3)'}`,
            }}
          >
            {activeRole === 'admin' ? <Crown size={24} /> : <Briefcase size={24} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active System View (සජීවීව ක්‍රියාත්මක භූමිකාව)
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: activeRole === 'admin' ? 'rgba(147,51,234,0.15)' : 'rgba(37,99,235,0.15)',
                  color: activeRole === 'admin' ? '#9333EA' : '#2563EB',
                  fontWeight: 700,
                }}
              >
                {activeRole === 'admin' ? '👑 FULL ACCESS' : '💼 OPERATIONAL'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                {activeRole === 'admin' ? 'Administrator (ප්‍රධාන පරිපාලක)' : 'Executive Staff (විධායක නිලධාරී)'}
              </strong>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                • {activeRole === 'admin' ? 'All 21 Pages Accessible' : `${executiveAllowed.length}/21 Pages Accessible`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Toggle View Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Simulate Role:
          </span>
          <button
            type="button"
            className={`btn ${activeRole === 'admin' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => handleToggleLiveRole('admin')}
          >
            <Crown size={14} />
            <span>Admin View</span>
          </button>
          <button
            type="button"
            className={`btn ${activeRole === 'executive' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => handleToggleLiveRole('executive')}
          >
            <Briefcase size={14} />
            <span>Executive View</span>
          </button>
        </div>
      </div>

      {/* ==========================================================
          2. TWO PRIMARY ROLE CARDS (ADMIN vs EXECUTIVE)
          ========================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        {/* CARD 1: ADMINISTRATOR ROLE */}
        <div
          className="panel"
          style={{
            padding: '22px',
            border: `2px solid ${selectedRoleTab === 'admin' ? '#9333EA' : 'var(--border-subtle)'}`,
            borderTop: '4px solid #9333EA',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: selectedRoleTab === 'admin' ? 'rgba(147, 51, 234, 0.04)' : 'var(--card-bg)',
          }}
          onClick={() => setSelectedRoleTab('admin')}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(147, 51, 234, 0.15)',
                  color: '#9333EA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Crown size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  Administrator Role (පරිපාලක)
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Store Owner & Managing Director Level
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'rgba(147, 51, 234, 0.15)',
                color: '#9333EA',
                border: '1px solid rgba(147, 51, 234, 0.3)',
              }}
            >
              21/21 Full Access
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Complete, unrestricted control across all financial ledgers, profit margin analysis, day-end balancing, store configurations, data backups, and access control.
          </p>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: '#9333EA', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={14} /> Full Permissions Permanent (Unrestricted)
            </span>
            <button
              type="button"
              className={`btn ${selectedRoleTab === 'admin' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRoleTab('admin');
              }}
            >
              Inspect Modules →
            </button>
          </div>
        </div>

        {/* CARD 2: EXECUTIVE ROLE */}
        <div
          className="panel"
          style={{
            padding: '22px',
            border: `2px solid ${selectedRoleTab === 'executive' ? '#2563EB' : 'var(--border-subtle)'}`,
            borderTop: '4px solid #2563EB',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: selectedRoleTab === 'executive' ? 'rgba(37, 99, 235, 0.04)' : 'var(--card-bg)',
          }}
          onClick={() => setSelectedRoleTab('executive')}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(37, 99, 235, 0.15)',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Briefcase size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  Executive Staff Role (විධායක)
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Showroom Sales, Inventory & Field Staff
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'rgba(37, 99, 235, 0.15)',
                color: '#2563EB',
                border: '1px solid rgba(37, 99, 235, 0.3)',
              }}
            >
              {executiveAllowed.length}/21 Pages Allowed
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Operational access for showroom furniture sales, customer directory, deliveries, stock monitoring, and center management. Permissions for sensitive financial and admin pages can be toggled by the Admin.
          </p>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sliders size={14} /> Customizable Access ({21 - executiveAllowed.length} Locked)
            </span>
            <button
              type="button"
              className={`btn ${selectedRoleTab === 'executive' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRoleTab('executive');
              }}
            >
              Configure Access →
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================================
          3. CONFIGURATION CONTROLS & MODULES CHECKLIST
          ========================================================== */}
      <div className="panel" style={{ padding: '0px', overflow: 'hidden' }}>
        {/* Panel Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--card-bg)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                {selectedRoleTab === 'admin'
                  ? '👑 Administrator Page Privileges (පරිපාලක අවසර)'
                  : '💼 Executive Staff Page Access Privileges (විධායක නිලධාරී අවසර)'}
              </h3>
              <span
                style={{
                  fontSize: '0.74rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  background: selectedRoleTab === 'admin' ? 'rgba(147,51,234,0.15)' : 'rgba(37,99,235,0.15)',
                  color: selectedRoleTab === 'admin' ? '#9333EA' : '#2563EB',
                }}
              >
                {selectedRoleTab === 'admin' ? '21 / 21 Modules Active' : `${executiveAllowed.length} of 21 Modules Allowed`}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {selectedRoleTab === 'admin'
                ? 'All pages and administrative features are permanently enabled for the Administrator role.'
                : 'Toggle which system modules and sections the Executive staff can view and operate.'}
            </p>
          </div>

          {/* Quick Preset Buttons (Shown when configuring Executive role) */}
          {selectedRoleTab === 'executive' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Presets:</span>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                onClick={() => handleApplyPreset('standard')}
                title="Recommended operational setup: Orders, Products, Stock, Customers, Centers & Sales"
              >
                ⭐ Standard Recommended
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                onClick={() => handleApplyPreset('sales_cashier')}
                title="Showroom Sales & Cash Desk setup"
              >
                💵 Sales & Billing
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                onClick={() => handleApplyPreset('workshop_stock')}
                title="Carpentry & Warehouse setup"
              >
                🔨 Workshop & Stock
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                onClick={() => handleApplyPreset('all')}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                onClick={() => handleApplyPreset('none')}
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--ash-50)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Search box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search module by name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--card-bg)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              className={`filter-chip-btn ${categoryFilter === 'all' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setCategoryFilter('all')}
            >
              All Categories ({SYSTEM_MODULES.length})
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-chip-btn ${categoryFilter === cat ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* View Switcher: Cards vs Matrix */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`view-toggle-btn ${viewStyle === 'cards' ? 'active' : ''}`}
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={() => setViewStyle('cards')}
            >
              Grid View
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewStyle === 'matrix' ? 'active' : ''}`}
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={() => setViewStyle('matrix')}
            >
              Matrix View
            </button>
          </div>
        </div>

        {/* ==========================================================
            VIEW A: CATEGORIZED INTERACTIVE CARDS GRID
            ========================================================== */}
        {viewStyle === 'cards' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(modulesByCategory).map(([category, modules]) => (
              <div
                key={category}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'var(--card-bg)',
                }}
              >
                {/* Section Header */}
                <div
                  style={{
                    background: 'var(--ash-50)',
                    padding: '10px 18px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getCategoryIcon(category)}
                    <span>{category}</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {selectedRoleTab === 'admin'
                      ? `${modules.length} of ${modules.length} Allowed`
                      : `${modules.filter((m) => executiveAllowed.includes(m.id)).length} of ${modules.length} Allowed`}
                  </span>
                </div>

                {/* Module Cards Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '12px',
                    padding: '16px',
                  }}
                >
                  {modules.map((mod) => {
                    const isAllowed =
                      selectedRoleTab === 'admin' ? true : executiveAllowed.includes(mod.id);

                    return (
                      <div
                        key={mod.id}
                        onClick={() => {
                          if (selectedRoleTab === 'executive') {
                            handleToggleModule(mod.id);
                          }
                        }}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          border: `1.5px solid ${isAllowed ? 'var(--primary-border)' : 'var(--border-subtle)'}`,
                          background: isAllowed ? 'var(--primary-tint)' : 'var(--ash-50)',
                          cursor: selectedRoleTab === 'executive' ? 'pointer' : 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                          transition: 'all 0.15s ease',
                          opacity: !isAllowed ? 0.75 : 1,
                        }}
                      >
                        {/* Header: Title, Category & Toggle */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                {mod.label}
                              </strong>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '1px' }}>
                              {mod.label_si}
                            </span>
                          </div>

                          {/* Toggle Switch / Status indicator */}
                          {selectedRoleTab === 'admin' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                background: 'rgba(147, 51, 234, 0.15)',
                                color: '#9333EA',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              <Check size={13} strokeWidth={3} /> Full
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleModule(mod.id);
                              }}
                              style={{
                                background: isAllowed ? '#059669' : 'var(--ash-300)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '14px',
                                padding: '3px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {isAllowed ? <Check size={13} strokeWidth={3} /> : <Lock size={12} />}
                              <span>{isAllowed ? 'Allowed' : 'Locked'}</span>
                            </button>
                          )}
                        </div>

                        {/* Description */}
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          {mod.description}
                        </p>

                        {/* Footer: Sensitivity tag */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            ID: {mod.id}
                          </span>
                          {renderSensitivityBadge(mod.sensitivity)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==========================================================
            VIEW B: SIDE-BY-SIDE MATRIX COMPARISON
            ========================================================== */}
        {viewStyle === 'matrix' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ash-100)', borderBottom: '1.5px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', minWidth: '220px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    System Page Module
                  </th>
                  <th style={{ padding: '14px 14px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Category
                  </th>
                  <th style={{ padding: '14px 14px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Sensitivity
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.8rem', minWidth: '160px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ color: '#9333EA', fontWeight: 700 }}>👑 Administrator</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>All 21 Pages (Fixed)</span>
                    </div>
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.8rem', minWidth: '180px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ color: '#2563EB', fontWeight: 700 }}>💼 Executive Staff</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Interactive Toggle</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredModules.map((mod) => {
                  const isExecAllowed = executiveAllowed.includes(mod.id);

                  return (
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
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {mod.label_si} • {mod.description}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {mod.category}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {renderSensitivityBadge(mod.sensitivity)}
                      </td>

                      {/* Admin: Locked full check */}
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <span
                          title="Super Admin has mandatory locked access"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(147, 51, 234, 0.15)',
                            color: '#9333EA',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          <Check size={14} strokeWidth={3} /> Full Access
                        </span>
                      </td>

                      {/* Executive: Interactive checkbox */}
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: isExecAllowed ? 'rgba(5, 150, 105, 0.12)' : 'var(--ash-100)',
                            color: isExecAllowed ? '#059669' : 'var(--text-muted)',
                            border: `1px solid ${isExecAllowed ? 'rgba(5, 150, 105, 0.3)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isExecAllowed}
                            onChange={() => handleToggleModule(mod.id)}
                            style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
                          />
                          <span>{isExecAllowed ? 'Permitted' : 'Restricted'}</span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Footer Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--ash-50)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Permissions apply immediately across sidebar menus and page route locks.
            </span>
            {isModified && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'var(--accent)',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                ● Unsaved Modifications
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetDefaults}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!isModified}
              onClick={handleSave}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Save size={15} />
              <span>Save Permission Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
