// Authentication & User Accounts Storage for D N S Home Solutions

export const AUTH_STORAGE_KEY = 'dns_registered_accounts';
export const AUTH_SESSION_KEY = 'dns_session_user';

export const INITIAL_ACCOUNTS = [
  {
    id: 'usr_admin_001',
    name: 'D N S Administrator',
    email: 'admin@dnshomesolutions.lk',
    phone: '0771234567',
    password: 'admin123',
    role: 'admin',
    branch_code: 'MHG',
    center_code: 'C001',
    assignedCenter: 'all',
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr_exec_001',
    name: 'Executive Staff',
    email: 'executive@dnshomesolutions.lk',
    phone: '0779876543',
    password: 'exec123',
    role: 'executive',
    branch_code: 'MHG',
    center_code: 'C001',
    assignedCenter: 'MHG/C001',
    status: 'Active',
    created_at: '2026-01-15T00:00:00Z',
  },
];

// Helper: Load registered accounts
export const loadSavedAccounts = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load accounts from storage:', err);
  }
  // Initialize with default accounts
  saveAccountsToStorage(INITIAL_ACCOUNTS);
  return INITIAL_ACCOUNTS;
};

// Helper: Save accounts to storage
export const saveAccountsToStorage = (accounts) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts to storage:', err);
  }
};

// Helper: Get active authenticated session
export const getAuthenticatedUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.id && user.role) {
        return user;
      }
    }
  } catch (err) {
    console.error('Failed to read session:', err);
  }
  return null;
};

// Helper: Login User with credentials validation
export const loginUser = (email, password) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPass = String(password || '');

  if (!cleanEmail) {
    return { success: false, error: 'Email address is required.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Password is required.' };
  }

  const accounts = loadSavedAccounts();
  const user = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

  if (!user) {
    return {
      success: false,
      error: 'No account found with this email address. Please check email or create an account.',
    };
  }

  if (user.password !== cleanPass) {
    return {
      success: false,
      error: 'Incorrect password. Please verify your credentials and try again.',
    };
  }

  if (user.status === 'Inactive' || user.status === 'Suspended') {
    return {
      success: false,
      error: 'This account has been deactivated. Please contact the System Administrator.',
    };
  }

  // Create session object (without password)
  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    branch_code: user.branch_code || 'MHG',
    center_code: user.center_code || 'C001',
    assignedCenter: user.assignedCenter || (user.role === 'admin' ? 'all' : `${user.branch_code}/${user.center_code}`),
    logged_in_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionUser));
    localStorage.setItem('dnd_active_role', sessionUser.role);
  } catch (err) {
    console.error('Failed to save session:', err);
  }

  return { success: true, user: sessionUser };
};

// Helper: Register a new account
export const registerUser = ({ name, email, phone, role = 'executive', branch_code = 'MHG', center_code = 'C001', password }) => {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim();
  const cleanPass = String(password || '');

  // Validation
  if (!cleanName || cleanName.length < 3) {
    return { success: false, error: 'Full Name must be at least 3 characters long.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!cleanPhone || cleanPhone.length < 9) {
    return { success: false, error: 'Please enter a valid phone number (at least 9-10 digits).' };
  }

  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const accounts = loadSavedAccounts();
  const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
  }

  const newUser = {
    id: `usr_${Date.now().toString().slice(-6)}`,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    password: cleanPass,
    role: role === 'admin' ? 'admin' : 'executive',
    branch_code,
    center_code,
    assignedCenter: role === 'admin' ? 'all' : `${branch_code}/${center_code}`,
    status: 'Active',
    created_at: new Date().toISOString(),
  };

  const updatedAccounts = [...accounts, newUser];
  saveAccountsToStorage(updatedAccounts);

  // Auto login upon registration
  const sessionUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role,
    branch_code: newUser.branch_code,
    center_code: newUser.center_code,
    assignedCenter: newUser.assignedCenter,
    logged_in_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionUser));
    localStorage.setItem('dnd_active_role', sessionUser.role);
  } catch (err) {
    console.error('Failed to save session:', err);
  }

  return { success: true, user: sessionUser };
};

// Helper: Logout active user
export const logoutUser = () => {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
};

