import React, { useState } from 'react';
import { Calendar, Building2, ChevronDown, Sun, Moon } from 'lucide-react';
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
                    ? 'All Centers (සියල්ල)'
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
              <option value="all">🌐 All Centers (සියලු මධ්‍යස්ථාන — All Regional Hubs)</option>
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
                ? 'Switch to Light Mode (දීප්තිමත් තේමාව)'
                : 'Switch to Dark Mode (අඳුරු තේමාව)'
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
