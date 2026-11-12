import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  ShieldCheck,
  Crown,
  Briefcase,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Armchair,
  Layers,
  CreditCard,
  BarChart3,
  Check,
  ChevronRight,
} from 'lucide-react';
import { loginUser, registerUser } from '../utils/authData';
import { loadSavedCenters, formatCenterCode } from '../utils/centersData';

export default function LoginPage({ onLoginSuccess }) {
  // Mode: 'signin' | 'signup'
  const [authMode, setAuthMode] = useState('signin');

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInRemember, setSignInRemember] = useState(true);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpRole, setSignUpRole] = useState('executive'); // 'executive' | 'admin'
  const [signUpCenter, setSignUpCenter] = useState('MHG/C001');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpTerms, setSignUpTerms] = useState(true);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Centers list for registration dropdown
  const [centers] = useState(() => loadSavedCenters());

  // Error & Validation feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // One-Click Demo Credential Handler
  const handleFillDemo = (type) => {
    setErrorMessage('');
    setFieldErrors({});
    if (type === 'admin') {
      setSignInEmail('admin@dnshomesolutions.lk');
      setSignInPassword('admin123');
    } else {
      setSignInEmail('executive@dnshomesolutions.lk');
      setSignInPassword('exec123');
    }
  };

  // Switch Auth Mode
  const switchMode = (mode) => {
    setAuthMode(mode);
    setErrorMessage('');
    setFieldErrors({});
    setSuccessMessage('');
  };

  // Validate Sign In
  const validateSignIn = () => {
    const errors = {};
    const emailClean = signInEmail.trim();
    if (!emailClean) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!signInPassword) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Sign In Submit
  const handleSignInSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateSignIn()) {
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = loginUser(signInEmail, signInPassword);
      setIsSubmitting(false);

      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
      }
    }, 350);
  };

  // Validate Sign Up
  const validateSignUp = () => {
    const errors = {};
    const nameClean = signUpName.trim();
    const emailClean = signUpEmail.trim();
    const phoneClean = signUpPhone.trim();

    if (!nameClean || nameClean.length < 3) {
      errors.name = 'Full Name must be at least 3 characters.';
    }

    if (!emailClean) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      errors.email = 'Please enter a valid corporate email.';
    }

    if (!phoneClean) {
      errors.phone = 'Phone number is required.';
    } else if (phoneClean.replace(/[^0-9]/g, '').length < 9) {
      errors.phone = 'Enter a valid 9-10 digit mobile number.';
    }

    if (!signUpPassword || signUpPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (signUpPassword !== signUpConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!signUpTerms) {
      errors.terms = 'You must accept employee security terms.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Sign Up Submit
  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateSignUp()) {
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const [bCode, cCode] = signUpCenter.includes('/')
        ? signUpCenter.split('/')
        : ['MHG', 'C001'];

      const res = registerUser({
        name: signUpName,
        email: signUpEmail,
        phone: signUpPhone,
        role: signUpRole,
        branch_code: bCode,
        center_code: cCode,
        password: signUpPassword,
      });

      setIsSubmitting(false);

      if (res.success) {
        setSuccessMessage('Account created successfully! Logging you into the workspace...');
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(res.user);
          }
        }, 600);
      } else {
        setErrorMessage(res.error || 'Registration failed. Please check form fields.');
      }
    }, 400);
  };

  return (
    <div className="login-split-container">
      <style>{`
        .login-split-container {
          min-height: 100vh;
          display: flex;
          background: #0F172A;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        }
        .login-hero-panel {
          flex: 0 0 43%;
          max-width: 44%;
          background: linear-gradient(145deg, #0A192F 0%, #0F172A 50%, #1E3A8A 100%);
          color: #fff;
          padding: 48px 50px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .login-form-panel {
          flex: 1 1 57%;
          background: linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 48px 40px;
          overflow-y: auto;
        }
        @media (max-width: 1024px) {
          .login-split-container {
            flex-direction: column !important;
          }
          .login-hero-panel {
            flex: none !important;
            max-width: 100% !important;
            padding: 36px 24px !important;
          }
          .login-form-panel {
            flex: none !important;
            max-width: 100% !important;
            padding: 36px 20px !important;
          }
        }
      `}</style>

      {/* =================================================================
          LEFT HERO / BRAND SHOWCASE PANEL
          ================================================================= */}
      <div className="login-hero-panel">
        {/* Ambient Glow Orbs */}
        <div
          style={{
            position: 'absolute',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(37,99,235,0) 70%)',
            top: '-100px',
            left: '-100px',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0) 70%)',
            bottom: '-120px',
            right: '-120px',
            pointerEvents: 'none',
          }}
        />

        {/* Top Brand Block */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '14px',
                background: '#FFFFFF',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              <img
                src="/ds-logo.png"
                alt="D N S Home Solutions Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.04em', color: '#FFFFFF' }}>
                  D N S
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                    color: '#0F172A',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  HOME SOLUTIONS
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '3px', fontWeight: 600 }}>
                Handcrafted Solid Woodcraft • Workshop & Showroom ERP
              </div>
            </div>
          </div>
        </div>

        {/* Center Pitch & Highlights */}
        <div style={{ position: 'relative', zIndex: 2, margin: '40px 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(37,99,235,0.25)',
              border: '1px solid rgba(96,165,250,0.4)',
              color: '#93C5FD',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '18px',
            }}
          >
            <Sparkles size={14} color="#FBBF24" />
            <span>Enterprise Management System 2026</span>
          </div>

          <h1
            style={{
              fontSize: '2.15rem',
              fontWeight: 900,
              lineHeight: 1.25,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              marginBottom: '14px',
            }}
          >
            Streamlined Furniture Manufacturing, Client Loans & Showroom Sales.
          </h1>

          <p style={{ fontSize: '0.94rem', color: '#CBD5E1', lineHeight: 1.6, maxWidth: '480px', marginBottom: '30px' }}>
            Complete workshop inventory audit, multi-distribution center dispatch, and structured customer installment repayment tracking designed specifically for the furniture industry.
          </p>

          {/* Feature Highlight Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '520px' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Armchair size={16} color="#FBBF24" />
                </div>
                <strong style={{ fontSize: '0.84rem', color: '#FFFFFF' }}>Master Woodcraft</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8', lineHeight: 1.4 }}>
                Solid Teak, Mahogany & Melamine models with dimension specs and workshop stock.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={16} color="#4ADE80" />
                </div>
                <strong style={{ fontSize: '0.84rem', color: '#FFFFFF' }}>Client Loan Ledgers</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8', lineHeight: 1.4 }}>
                Weekly & monthly installment plans, advance deposits, and settlement receipts.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="#60A5FA" />
                </div>
                <strong style={{ fontSize: '0.84rem', color: '#FFFFFF' }}>Multi-Center Network</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8', lineHeight: 1.4 }}>
                Regional distribution codes: Maharagama, Colombo, Negombo, Kandy & Galle.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="#C084FC" />
                </div>
                <strong style={{ fontSize: '0.84rem', color: '#FFFFFF' }}>Dual Role Control</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8', lineHeight: 1.4 }}>
                Admin full clearance + Executive operational access with locked administrative pages.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Trust Line */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#64748B', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '18px' }}>
          <span>© 2026 D N S Home Solutions. All Rights Reserved.</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }}></span>
            ERP Security Node Active
          </span>
        </div>
      </div>

      {/* =================================================================
          RIGHT FORM PANEL (SIGN IN / SIGN UP) - ENLARGED & USER FRIENDLY
          ================================================================= */}
      <div className="login-form-panel">
        <div style={{ width: '100%', maxWidth: '580px' }}>
          {/* Top Auth Mode Switcher */}
          <div
            style={{
              display: 'flex',
              background: '#E2E8F0',
              padding: '5px',
              borderRadius: '14px',
              marginBottom: '24px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <button
              type="button"
              onClick={() => switchMode('signin')}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                borderRadius: '10px',
                background: authMode === 'signin' ? '#FFFFFF' : 'transparent',
                color: authMode === 'signin' ? 'var(--primary, #1E4D8C)' : '#64748B',
                fontWeight: 800,
                fontSize: '0.94rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: authMode === 'signin' ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Lock size={16} /> Sign In (Login)
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                borderRadius: '10px',
                background: authMode === 'signup' ? '#FFFFFF' : 'transparent',
                color: authMode === 'signup' ? 'var(--primary, #1E4D8C)' : '#64748B',
                fontWeight: 800,
                fontSize: '0.94rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: authMode === 'signup' ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <User size={16} /> Create Account (Sign Up)
            </button>
          </div>

          {/* Form Card */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '38px 44px',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            {/* Header titles */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {authMode === 'signin' ? 'Sign In to Your Workspace' : 'Create Staff Profile'}
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: '#64748B', lineHeight: 1.5 }}>
                {authMode === 'signin'
                  ? 'Access orders, customer loans, stock tracking, and executive ledger.'
                  : 'Register a new employee with Administrator or Executive role permissions.'}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#991B1B',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ lineHeight: 1.45 }}>{errorMessage}</div>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#166534',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                <CheckCircle2 size={18} color="#16A34A" />
                <div style={{ fontWeight: 600 }}>{successMessage}</div>
              </div>
            )}

            {/* =========================================================
                TAB 1: SIGN IN FORM
                ========================================================= */}
            {authMode === 'signin' && (
              <form onSubmit={handleSignInSubmit}>
                {/* One-Click Quick Demo Pill Buttons */}
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                    Quick Demo Credentials (One-Click Test):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleFillDemo('admin')}
                      style={{
                        background: '#FAF5FF',
                        border: '1.5px solid #E9D5FF',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      title="Full access to all modules including Administration"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9333EA', fontWeight: 800, fontSize: '0.84rem' }}>
                        <Crown size={15} /> Administrator
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6B21A8', marginTop: '3px', fontWeight: 600 }}>
                        admin@dnshomesolutions.lk
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFillDemo('exec')}
                      style={{
                        background: '#EFF6FF',
                        border: '1.5px solid #BFDBFE',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      title="Operational access only (Orders, Advances, Loans, Stock)"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB', fontWeight: 800, fontSize: '0.84rem' }}>
                        <Briefcase size={15} /> Executive Staff
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#1E40AF', marginTop: '3px', fontWeight: 600 }}>
                        executive@dnshomesolutions.lk
                      </div>
                    </button>
                  </div>
                </div>

                {/* Email Field */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                    Corporate Email Address *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94A3B8' }} />
                    <input
                      type="email"
                      placeholder="e.g. admin@dnshomesolutions.lk"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px 12px 42px',
                        borderRadius: '10px',
                        border: `1.5px solid ${fieldErrors.email ? '#EF4444' : '#CBD5E1'}`,
                        fontSize: '0.92rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        background: '#F8FAFC',
                      }}
                      onFocus={(e) => (e.target.style.background = '#FFFFFF')}
                      onBlur={(e) => (e.target.style.background = '#F8FAFC')}
                    />
                  </div>
                  {fieldErrors.email && (
                    <span style={{ fontSize: '0.74rem', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.email}
                    </span>
                  )}
                </div>

                {/* Password Field */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1E293B' }}>
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('For demonstration, you can use:\n• Admin: admin123\n• Executive: exec123\nOr click the Quick Demo Credentials buttons above.')}
                      style={{ background: 'transparent', border: 'none', color: '#2563EB', fontSize: '0.76rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94A3B8' }} />
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      placeholder="Enter account password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 44px 12px 42px',
                        borderRadius: '10px',
                        border: `1.5px solid ${fieldErrors.password ? '#EF4444' : '#CBD5E1'}`,
                        fontSize: '0.92rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        background: '#F8FAFC',
                      }}
                      onFocus={(e) => (e.target.style.background = '#FFFFFF')}
                      onBlur={(e) => (e.target.style.background = '#F8FAFC')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '12px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B',
                        padding: '2px',
                      }}
                    >
                      {showSignInPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <span style={{ fontSize: '0.74rem', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.password}
                    </span>
                  )}
                </div>

                {/* Remember Me */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <input
                    type="checkbox"
                    id="remember_me"
                    checked={signInRemember}
                    onChange={(e) => setSignInRemember(e.target.checked)}
                    style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                  />
                  <label htmlFor="remember_me" style={{ fontSize: '0.84rem', color: '#475569', cursor: 'pointer' }}>
                    Keep me signed in on this browser
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px 22px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #1E4D8C 0%, #173866 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 6px 20px rgba(30,77,140,0.32)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSubmitting ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In to System</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* =========================================================
                TAB 2: CREATE ACCOUNT (SIGN UP) FORM - SPACIOUS & MODERN
                ========================================================= */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUpSubmit}>
                {/* Full Name */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                    Full Staff Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="e.g. Sunil Jayawardena"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 16px 11px 42px',
                        borderRadius: '10px',
                        border: `1.5px solid ${fieldErrors.name ? '#EF4444' : '#CBD5E1'}`,
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#F8FAFC',
                      }}
                    />
                  </div>
                  {fieldErrors.name && (
                    <span style={{ fontSize: '0.74rem', color: '#DC2626', marginTop: '3px', display: 'block' }}>
                      {fieldErrors.name}
                    </span>
                  )}
                </div>

                {/* Email & Phone Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                      Email Address *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={17} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94A3B8' }} />
                      <input
                        type="email"
                        placeholder="officer@dnshome.lk"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 12px 11px 38px',
                          borderRadius: '10px',
                          border: `1.5px solid ${fieldErrors.email ? '#EF4444' : '#CBD5E1'}`,
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#F8FAFC',
                        }}
                      />
                    </div>
                    {fieldErrors.email && (
                      <span style={{ fontSize: '0.74rem', color: '#DC2626', marginTop: '3px', display: 'block' }}>
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                      Mobile Phone *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={17} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94A3B8' }} />
                      <input
                        type="text"
                        placeholder="077XXXXXXX"
                        value={signUpPhone}
                        onChange={(e) => setSignUpPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 12px 11px 38px',
                          borderRadius: '10px',
                          border: `1.5px solid ${fieldErrors.phone ? '#EF4444' : '#CBD5E1'}`,
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#F8FAFC',
                        }}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <span style={{ fontSize: '0.74rem', color: '#DC2626', marginTop: '3px', display: 'block' }}>
                        {fieldErrors.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assigned Center Hub */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                    Assigned Center Hub
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94A3B8' }} />
                    <select
                      value={signUpCenter}
                      onChange={(e) => setSignUpCenter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 16px 11px 42px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#F8FAFC',
                        cursor: 'pointer',
                      }}
                    >
                      {centers.map((c) => (
                        <option key={c.id} value={`${c.branch_code}/${formatCenterCode(c.center_code)}`}>
                          {c.branch_code}/{formatCenterCode(c.center_code)} — {c.city || c.name} ({c.type || 'Showroom'})
                        </option>
                      ))}
                      <option value="all">All Distribution Centers (Island-Wide Head Office)</option>
                    </select>
                  </div>
                </div>

                {/* System Role Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                    System Clearance & Role *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Executive Card */}
                    <button
                      type="button"
                      onClick={() => setSignUpRole('executive')}
                      style={{
                        background: signUpRole === 'executive' ? '#EFF6FF' : '#F8FAFC',
                        border: signUpRole === 'executive' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.86rem', color: '#1E40AF' }}>
                          <Briefcase size={15} /> Executive Staff
                        </div>
                        {signUpRole === 'executive' && <Check size={16} color="#2563EB" strokeWidth={3} />}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', lineHeight: 1.35 }}>
                        Showroom sales, orders, advances & stock
                      </div>
                    </button>

                    {/* Administrator Card */}
                    <button
                      type="button"
                      onClick={() => setSignUpRole('admin')}
                      style={{
                        background: signUpRole === 'admin' ? '#FAF5FF' : '#F8FAFC',
                        border: signUpRole === 'admin' ? '2px solid #9333EA' : '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.86rem', color: '#6B21A8' }}>
                          <Crown size={15} /> Administrator
                        </div>
                        {signUpRole === 'admin' && <Check size={16} color="#9333EA" strokeWidth={3} />}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', lineHeight: 1.35 }}>
                        Full clearance (Settings, Users & Backup)
                      </div>
                    </button>
                  </div>
                </div>

                {/* Password & Confirm Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                      Password *
                    </label>
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${fieldErrors.password ? '#EF4444' : '#CBD5E1'}`,
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#F8FAFC',
                      }}
                    />
                    {fieldErrors.password && (
                      <span style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '3px', display: 'block' }}>
                        {fieldErrors.password}
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                      Confirm Password *
                    </label>
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder="Repeat password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${fieldErrors.confirmPassword ? '#EF4444' : '#CBD5E1'}`,
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#F8FAFC',
                      }}
                    />
                    {fieldErrors.confirmPassword && (
                      <span style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '3px', display: 'block' }}>
                        {fieldErrors.confirmPassword}
                      </span>
                    )}
                  </div>
                </div>

                {/* Show passwords toggle */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    style={{ background: 'transparent', border: 'none', fontSize: '0.76rem', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    {showSignUpPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showSignUpPassword ? 'Hide password' : 'Show password'}</span>
                  </button>
                </div>

                {/* Terms agreement */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '22px' }}>
                  <input
                    type="checkbox"
                    id="signup_terms"
                    checked={signUpTerms}
                    onChange={(e) => setSignUpTerms(e.target.checked)}
                    style={{ width: '17px', height: '17px', marginTop: '2px', cursor: 'pointer' }}
                  />
                  <label htmlFor="signup_terms" style={{ fontSize: '0.8rem', color: '#475569', cursor: 'pointer', lineHeight: 1.45 }}>
                    I confirm that I am an authorized employee of D N S Home Solutions and agree to company security protocols.
                  </label>
                </div>
                {fieldErrors.terms && (
                  <span style={{ fontSize: '0.72rem', color: '#DC2626', marginBottom: '10px', display: 'block' }}>
                    {fieldErrors.terms}
                  </span>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px 22px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #1E4D8C 0%, #173866 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 6px 20px rgba(30,77,140,0.32)',
                  }}
                >
                  {isSubmitting ? (
                    <span>Registering Account...</span>
                  ) : (
                    <>
                      <span>Create Account & Log In</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
