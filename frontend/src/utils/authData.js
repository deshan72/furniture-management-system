// Authentication & User Accounts Storage for D N S Home Solutions
// Supports Staff User Accounts, NIC-based DOB/Age, Login Credentials, and Roles

export const AUTH_STORAGE_KEY = 'dns_registered_accounts';
export const AUTH_SESSION_KEY = 'dns_session_user';

// Helper: Calculate Age in years from Date of Birth (YYYY-MM-DD)
export const calculateAgeFromDob = (dobString) => {
  if (!dobString) return '';
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
};

// Helper: Compress and convert image file to optimized Base64 Data URL (~30-60 KB)
export const compressImageFile = (file, maxDim = 500, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPG, PNG, or WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to read image.'));
    };
    reader.onerror = () => reject(new Error('Failed to load file.'));
  });
};

export const INITIAL_ACCOUNTS = [
  {
    id: 'usr_admin_001',
    name: 'D N S Administrator',
    username: 'admin',
    email: 'admin@dnshomesolutions.lk',
    phone: '0771234567',
    password: 'admin123',
    role: 'admin',
    nic: '198512345678',
    dob: '1985-05-03',
    age: 41,
    gender: 'Male',
    photo: '',
    branch_code: 'MHG',
    center_code: 'C001',
    assignedCenter: 'all',
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr_exec_001',
    name: 'Executive Staff',
    username: 'executive',
    email: 'executive@dnshomesolutions.lk',
    phone: '0779876543',
    password: 'exec123',
    role: 'executive',
    nic: '199214567890',
    dob: '1992-05-24',
    age: 34,
    gender: 'Male',
    photo: '',
    branch_code: 'MHG',
    center_code: 'C001',
    assignedCenter: 'MHG/C001',
    status: 'Active',
    created_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'usr_cashier_001',
    name: 'Showroom Cashier',
    username: 'cashier',
    email: 'cashier@dnshomesolutions.lk',
    phone: '0773344556',
    password: 'cashier123',
    role: 'cashier',
    nic: '199518901234',
    dob: '1995-07-08',
    age: 31,
    gender: 'Male',
    photo: '',
    branch_code: 'MHG',
    center_code: 'C001',
    assignedCenter: 'MHG/C001',
    status: 'Active',
    created_at: '2026-02-01T00:00:00Z',
  },
];

// Helper: Normalize user record with defaults
const normalizeAccount = (a) => {
  const username = a.username || (a.email ? a.email.split('@')[0] : `user_${a.id?.slice(-4) || '1'}`);
  const dob = a.dob || '';
  const age = a.age || (dob ? calculateAgeFromDob(dob) : '');
  return {
    ...a,
    username: username.toLowerCase().trim(),
    dob,
    age: age !== '' ? Number(age) : '',
    photo: a.photo || '',
    nic: a.nic || '',
    gender: a.gender || 'Not Specified',
    role: a.role || 'executive',
    status: a.status || 'Active',
    assignedCenter: a.assignedCenter || 'all',
  };
};

// Helper: Load registered accounts
export const loadSavedAccounts = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure initial accounts like admin and cashier exist if missing
        let accounts = parsed.map(normalizeAccount);
        const hasAdmin = accounts.some((a) => a.username === 'admin' || a.role === 'admin');
        if (!hasAdmin) {
          accounts.unshift(INITIAL_ACCOUNTS[0]);
        }
        const hasExec = accounts.some((a) => a.username === 'executive' || a.role === 'executive');
        if (!hasExec) {
          accounts.push(INITIAL_ACCOUNTS[1]);
        }
        const hasCashier = accounts.some((a) => a.username === 'cashier' || a.role === 'cashier');
        if (!hasCashier) {
          accounts.push(INITIAL_ACCOUNTS[2]);
        }
        return accounts;
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
    window.dispatchEvent(new CustomEvent('dns_users_updated', { detail: accounts }));
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

// Helper: Login User with credentials validation (Supports Username OR Email)
export const loginUser = (identifier, password) => {
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPass = String(password || '');

  if (!cleanId) {
    return { success: false, error: 'Username or Email address is required.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Password is required.' };
  }

  const accounts = loadSavedAccounts();
  // Match either by username OR by email address
  const user = accounts.find((a) => {
    const matchUsername = a.username && a.username.toLowerCase().trim() === cleanId;
    const matchEmail = a.email && a.email.toLowerCase().trim() === cleanId;
    return matchUsername || matchEmail;
  });

  if (!user) {
    return {
      success: false,
      error: `No account found matching "${cleanId}". Please check your username or password.`,
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
    username: user.username || user.email?.split('@')[0] || 'staff',
    email: user.email || `${user.username}@dnshomesolutions.lk`,
    phone: user.phone || '',
    role: user.role || 'executive',
    nic: user.nic || '',
    dob: user.dob || '',
    age: user.age || (user.dob ? calculateAgeFromDob(user.dob) : ''),
    gender: user.gender || 'Not Specified',
    photo: user.photo || '',
    branch_code: user.branch_code || 'MHG',
    center_code: user.center_code || 'C001',
    assignedCenter: user.assignedCenter || (user.role === 'admin' ? 'all' : `${user.branch_code || 'MHG'}/${user.center_code || 'C001'}`),
    customPermissions: user.customPermissions || null,
    logged_in_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionUser));
    localStorage.setItem('dnd_active_role', sessionUser.role);
    window.dispatchEvent(new Event('dns_auth_change'));
  } catch (err) {
    console.error('Failed to save session:', err);
  }

  return { success: true, user: sessionUser };
};

// Helper: Create a New Staff User Account (by Admin)
export const createUserAccount = ({
  name,
  username,
  password,
  role = 'executive',
  nic = '',
  dob = '',
  age = null,
  gender = 'Male',
  photo = '',
  phone = '',
  email = '',
  branch_code = 'MHG',
  center_code = 'C001',
  assignedCenter = 'all',
  customPermissions = null,
  status = 'Active',
}) => {
  const cleanName = String(name || '').trim();
  const cleanUsername = String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const cleanPass = String(password || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanNic = String(nic || '').trim().toUpperCase();

  // Validations
  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Full Name must be at least 2 characters long.' };
  }

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters (letters, numbers, dots, hyphens).' };
  }

  if (!cleanPass || cleanPass.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  const accounts = loadSavedAccounts();

  // Check username uniqueness
  const existingUsername = accounts.find((a) => a.username && a.username.toLowerCase() === cleanUsername);
  if (existingUsername) {
    return { success: false, error: `Username "${cleanUsername}" is already taken. Please choose another username.` };
  }

  // Derive email if not provided
  const cleanEmail = email && email.includes('@')
    ? email.trim().toLowerCase()
    : `${cleanUsername}@dnshomesolutions.lk`;

  // Calculate age if DOB provided
  const computedAge = age !== null && age !== undefined && age !== ''
    ? Number(age)
    : (dob ? calculateAgeFromDob(dob) : '');

  const newAccount = {
    id: `usr_${Date.now().toString().slice(-6)}`,
    name: cleanName,
    username: cleanUsername,
    password: cleanPass,
    email: cleanEmail,
    phone: cleanPhone,
    role,
    nic: cleanNic,
    dob: dob || '',
    age: computedAge !== '' ? computedAge : null,
    gender: gender || 'Not Specified',
    photo: photo || '',
    branch_code,
    center_code,
    assignedCenter: assignedCenter || (role === 'admin' ? 'all' : `${branch_code}/${center_code}`),
    customPermissions: Array.isArray(customPermissions) ? customPermissions : null,
    status: status || 'Active',
    created_at: new Date().toISOString(),
  };

  const updatedAccounts = [...accounts, newAccount];
  saveAccountsToStorage(updatedAccounts);

  return { success: true, user: newAccount };
};

// Helper: Update Existing Staff User Account
export const updateUserAccount = (id, updatedFields) => {
  const accounts = loadSavedAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) {
    return { success: false, error: 'Staff account not found.' };
  }

  const current = accounts[index];

  // If username is changing, ensure uniqueness
  if (updatedFields.username) {
    const cleanUsername = String(updatedFields.username).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const conflict = accounts.find((a) => a.id !== id && a.username && a.username.toLowerCase() === cleanUsername);
    if (conflict) {
      return { success: false, error: `Username "${cleanUsername}" is already taken.` };
    }
    updatedFields.username = cleanUsername;
  }

  // If DOB changed and age not explicitly given, re-calculate age
  if (updatedFields.dob && updatedFields.age === undefined) {
    updatedFields.age = calculateAgeFromDob(updatedFields.dob);
  }

  const updated = {
    ...current,
    ...updatedFields,
    updated_at: new Date().toISOString(),
  };

  accounts[index] = updated;
  saveAccountsToStorage(accounts);

  // If updated account is currently logged in session, update session too
  const session = getAuthenticatedUser();
  if (session && session.id === id) {
    const newSession = {
      ...session,
      name: updated.name,
      username: updated.username,
      role: updated.role,
      photo: updated.photo,
      nic: updated.nic,
      dob: updated.dob,
      age: updated.age,
      assignedCenter: updated.assignedCenter,
      phone: updated.phone,
    };
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(newSession));
      localStorage.setItem('dnd_active_role', newSession.role);
      window.dispatchEvent(new Event('dns_auth_change'));
    } catch (e) {
      console.error(e);
    }
  }

  return { success: true, user: updated };
};

// Helper: Delete Staff User Account
export const deleteUserAccount = (id, currentUserId = null) => {
  if (currentUserId && id === currentUserId) {
    return { success: false, error: 'You cannot delete your own currently logged-in account.' };
  }

  const accounts = loadSavedAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) {
    return { success: false, error: 'Account not found.' };
  }

  // Prevent deleting the primary admin account if it's the only admin
  if (target.role === 'admin' || target.username === 'admin') {
    const adminCount = accounts.filter((a) => a.role === 'admin').length;
    if (adminCount <= 1) {
      return { success: false, error: 'Cannot delete the primary Administrator account.' };
    }
  }

  const filtered = accounts.filter((a) => a.id !== id);
  saveAccountsToStorage(filtered);
  return { success: true };
};

// Helper: Register a new account (Public Sign Up)
export const registerUser = ({
  name,
  username,
  email,
  phone,
  role = 'executive',
  branch_code = 'MHG',
  center_code = 'C001',
  password,
  nic = '',
  dob = '',
  age = null,
  photo = '',
}) => {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim();
  const cleanPass = String(password || '');
  const cleanUsername = username
    ? String(username).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
    : cleanEmail.split('@')[0];

  // Validation
  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Full Name must be at least 2 characters long.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!cleanPhone || cleanPhone.length < 9) {
    return { success: false, error: 'Please enter a valid phone number (at least 9-10 digits).' };
  }

  if (!cleanPass || cleanPass.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  const accounts = loadSavedAccounts();
  const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail || a.username === cleanUsername);
  if (existing) {
    return { success: false, error: 'An account with this email address or username already exists. Please sign in instead.' };
  }

  return createUserAccount({
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    phone: cleanPhone,
    password: cleanPass,
    role,
    branch_code,
    center_code,
    assignedCenter: role === 'admin' ? 'all' : `${branch_code}/${center_code}`,
    nic,
    dob,
    age,
    photo,
    status: 'Active',
  });
};

// Helper: Logout active user
export const logoutUser = () => {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    window.dispatchEvent(new Event('dns_auth_change'));
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
};
