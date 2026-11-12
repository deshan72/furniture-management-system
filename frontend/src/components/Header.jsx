import React, { useState } from 'react';
import { Calendar, Building2, ChevronDown, Sun, Moon, Crown, Briefcase, LogOut } from 'lucide-react';
import { formatCenterCode } from '../utils/centersData';

export default function Header({
  title,
  subtitle,
  selectedCenter = 'all',
  onSelectCenter,
  centers = [],
  theme = 'light',
  onToggleTheme,
  onQuickAction,
  quickActionLabel,
  currentUser,
  onSwitchRole,
  onLogout,
}) {
  const [todayFormatted] = useState(() =>
    new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );

  // Find active center object if selected
  const activeCenter = centers.find((c) => {
    const key = `${c.branch_code?.toUpperCase()}/${formatCenterCode(c.center_code)}`;
    return key === selectedCenter || c.id === selectedCenter;
  });

  return (
    <header className="top-header">
      <div className="page-headline">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="header-actions">
        {/* ==========================================
            0. ROLE SIMULATOR BADGE & SWITCHER
            ========================================== */}
        {onSwitchRole && currentUser && (
          <button
            type="button"
            className="header-role-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: currentUser.role === 'admin' ? 'rgba(147, 51, 234, 0.14)' : 'rgba(37, 99, 235, 0.14)',
              border: `1.5px solid ${currentUser.role === 'admin' ? 'rgba(147, 51, 234, 0.35)' : 'rgba(37, 99, 235, 0.35)'}`,
              color: currentUser.role === 'admin' ? '#9333EA' : '#2563EB',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => onSwitchRole(currentUser.role === 'admin' ? 'executive' : 'admin')}
            title={`Active Role: ${currentUser.role === 'admin' ? 'Administrator (Full Access)' : 'Executive Staff (Operational)'}. Click to switch role.`}
          >
            {currentUser.role === 'admin' ? <Crown size={14} /> : <Briefcase size={14} />}
            <span>{currentUser.role === 'admin' ? '👑 Admin View' : '💼 Executive View'}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.65, marginLeft: '2px' }}>⇄</span>
          </button>
        )}

        {/* ==========================================
            1. REGIONAL CENTER FILTER SELECTOR
            ========================================== */}
        {onSelectCenter && (
          <div
            className={`header-center-pill ${selectedCenter !== 'all' ? 'is-active' : ''}`}
            title="Filter data by Regional Distribution Center"
          >
            <div className="header-pill-left">
              <Building2 size={16} className="header-center-icon" />
              <div className="header-center-text">
                <span className="header-center-sub">Center</span>
                <span className="header-center-title">
                  {selectedCenter === 'all'
                    ? 'All Centers'
                    : activeCenter
                    ? `${activeCenter.branch_code} / ${formatCenterCode(activeCenter.center_code)}`
                    : selectedCenter}
                </span>
              </div>
            </div>

            {selectedCenter !== 'all' && (
              <span className="header-center-tag">
                {activeCenter?.city || 'Active'}
              </span>
            )}

            <ChevronDown size={14} className="header-chevron" />

            {/* Native Accessible Overlay Dropdown */}
            <select
              className="header-center-native-select"
              value={selectedCenter}
              onChange={(e) => onSelectCenter(e.target.value)}
              aria-label="Filter by Regional Center"
            >
              <option value="all">🌐 All Centers — All Regional Hubs</option>
              {centers.map((cntr) => {
                const centerKey = `${cntr.branch_code?.toUpperCase()}/${formatCenterCode(cntr.center_code)}`;
                return (
                  <option key={cntr.id || centerKey} value={centerKey}>
                    📍 {cntr.branch_code} / {formatCenterCode(cntr.center_code)} — {cntr.name} ({cntr.city})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* ==========================================
            2. DARK / LIGHT THEME TOGGLE SWITCH
            ========================================== */}
        {onToggleTheme && (
          <button
            type="button"
            className={`header-theme-toggle ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
            onClick={onToggleTheme}
            title={
              theme === 'dark'
                ? 'Switch to Light Mode'
                : 'Switch to Dark Mode'
            }
            aria-label="Toggle dark and light mode"
          >
            <span className="theme-toggle-track">
              <Sun size={13} className="theme-icon sun-icon" />
              <Moon size={13} className="theme-icon moon-icon" />
              <span className="theme-toggle-thumb" />
            </span>
            <span className="theme-toggle-label">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
        )}

        {/* ==========================================
            3. CURRENT DATE BADGE
            ========================================== */}
        <div className="header-date-pill" title="Today's Operational Date">
          <Calendar size={15} className="header-date-icon" />
          <span>{todayFormatted}</span>
        </div>

        {/* ==========================================
            4. LOG OUT ACTION
            ========================================== */}
        {onLogout && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (window.confirm('Are you sure you want to log out of D N S Home Solutions?')) {
                onLogout();
              }
            }}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#DC2626',
              borderColor: '#FECACA',
              background: '#FFF5F5',
            }}
            title="Log out of system and return to login screen"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        )}

        {/* Quick Action Button if any */}
        {quickActionLabel && onQuickAction && (
          <button className="btn btn-primary" onClick={onQuickAction}>
            {quickActionLabel}
          </button>
        )}
      </div>
    </header>
  );
}
