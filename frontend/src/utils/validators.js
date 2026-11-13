/**
 * Sri Lankan & System Validation Utilities
 * D & D Furniture Management System
 */

// Regex definitions
export const NIC_REGEX_OLD = /^[0-9]{9}[vVxX]$/;
export const NIC_REGEX_NEW = /^[0-9]{12}$/;
export const PHONE_REGEX = /^0[0-9]{9}$/; // Exactly 10 digits starting with 0

/**
 * Validates Sri Lankan National Identity Card (NIC)
 * - Old format: 9 digits followed by 'V' or 'X' (e.g. 851234567V) - 10 characters
 * - New format: 12 digits (e.g. 198512345678) - 12 characters
 *
 * @param {string} nic
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, message: string, type: 'old' | 'new' | null, cleanNic: string }}
 */
export const validateNic = (nic, isRequired = true) => {
  const clean = String(nic || '').trim().toUpperCase();
  if (!clean) {
    return {
      isValid: !isRequired,
      message: isRequired ? 'NIC (National Identity Card) is required.' : '',
      type: null,
      cleanNic: '',
    };
  }

  if (NIC_REGEX_OLD.test(clean)) {
    return {
      isValid: true,
      message: 'Valid Old Format NIC (9 digits + V/X)',
      type: 'old',
      cleanNic: clean,
    };
  }

  if (NIC_REGEX_NEW.test(clean)) {
    return {
      isValid: true,
      message: 'Valid New Format NIC (12 digits)',
      type: 'new',
      cleanNic: clean,
    };
  }

  // Diagnostic feedback
  if (clean.length < 10) {
    return {
      isValid: false,
      message: `NIC is too short (${clean.length} chars). Required: 10 chars (Old: 9 digits + V/X) or 12 digits (New).`,
      type: null,
      cleanNic: clean,
    };
  } else if (clean.length === 10) {
    if (!/[vVxX]$/.test(clean)) {
      return {
        isValid: false,
        message: '10-character Old NIC must end with "V" or "X" (e.g. 851234567V).',
        type: null,
        cleanNic: clean,
      };
    }
  } else if (clean.length === 11) {
    return {
      isValid: false,
      message: 'Invalid NIC length (11 chars). 12 digits are required for New NIC.',
      type: null,
      cleanNic: clean,
    };
  } else if (clean.length > 12) {
    return {
      isValid: false,
      message: `NIC is too long (${clean.length} chars). Maximum 12 digits allowed.`,
      type: null,
      cleanNic: clean,
    };
  } else if (clean.length === 12 && !/^[0-9]+$/.test(clean)) {
    return {
      isValid: false,
      message: '12-digit New NIC must contain only numbers (0-9).',
      type: null,
      cleanNic: clean,
    };
  }

  return {
    isValid: false,
    message: 'Invalid NIC format. Must be 9 digits + V/X or 12 digits.',
    type: null,
    cleanNic: clean,
  };
};

/**
 * Sanitizes input as user types NIC:
 * Allows digits, and allows V or X at the 10th position, limits to 12 chars max
 */
export const sanitizeNicInput = (value) => {
  if (!value) return '';
  const val = String(value).trim().toUpperCase();
  let sanitized = '';
  for (let i = 0; i < val.length && sanitized.length < 12; i++) {
    const ch = val[i];
    if (/\d/.test(ch)) {
      sanitized += ch;
    } else if ((ch === 'V' || ch === 'X') && sanitized.length === 9) {
      sanitized += ch;
      break; // Old NIC ends here (total 10 chars)
    }
  }
  return sanitized;
};

/**
 * Validates Sri Lankan Phone / Mobile Number
 * 10 digits without letters, starts with 0 (e.g. 077XXXXXXX)
 *
 * @param {string} phone
 * @param {boolean} isRequired
 * @returns {{ isValid: boolean, message: string, cleanPhone: string }}
 */
export const validatePhone = (phone, isRequired = true) => {
  const raw = String(phone || '').trim();
  const clean = raw.replace(/\D/g, '');

  if (!raw) {
    return {
      isValid: !isRequired,
      message: isRequired ? 'Phone number is required.' : '',
      cleanPhone: '',
    };
  }

  if (/[a-zA-Z]/.test(raw)) {
    return {
      isValid: false,
      message: 'Phone number cannot contain letters. Numbers only.',
      cleanPhone: clean,
    };
  }

  if (!clean.startsWith('0')) {
    return {
      isValid: false,
      message: 'Phone number must start with 0 (e.g. 077XXXXXXX).',
      cleanPhone: clean,
    };
  }

  if (clean.length < 10) {
    return {
      isValid: false,
      message: `Phone number is incomplete (${clean.length}/10 digits).`,
      cleanPhone: clean,
    };
  }

  if (clean.length > 10) {
    return {
      isValid: false,
      message: `Phone number is too long (${clean.length}/10 digits). Exactly 10 digits required.`,
      cleanPhone: clean,
    };
  }

  return {
    isValid: true,
    message: 'Valid 10-digit number.',
    cleanPhone: clean,
  };
};

/**
 * Sanitizes input as user types Phone:
 * Strips all non-digit characters and limits to 10 digits
 */
export const sanitizePhoneInput = (value) => {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 10);
};

/**
 * Validates Name (First Name / Last Name)
 */
export const validateName = (name, fieldName = 'First Name', isRequired = true) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return {
      isValid: !isRequired,
      message: isRequired ? `${fieldName} is required.` : '',
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      message: `${fieldName} must be at least 2 characters.`,
    };
  }

  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
    return {
      isValid: false,
      message: `${fieldName} should contain only letters and spaces (no numbers or symbols).`,
    };
  }

  return {
    isValid: true,
    message: 'Valid name.',
  };
};

/**
 * Validates Currency/Number Amount (>= 0)
 */
export const validateAmount = (value, fieldName = 'Amount', max = null) => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: true, message: '' };
  }
  const num = Number(value);
  if (isNaN(num)) {
    return { isValid: false, message: `${fieldName} must be a valid number.` };
  }
  if (num < 0) {
    return { isValid: false, message: `${fieldName} cannot be negative.` };
  }
  if (max !== null && num > max) {
    return { isValid: false, message: `${fieldName} cannot exceed maximum allowed (${max}).` };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates Email Address
 */
export const validateEmail = (email, isRequired = false) => {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    return { isValid: !isRequired, message: isRequired ? 'Email is required.' : '' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, message: 'Invalid email address format (e.g. name@example.com).' };
  }
  return { isValid: true, message: 'Valid email address.' };
};

