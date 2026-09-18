/**
 * Shared Validation Utilities
 * Ensures consistent validation across all registration screens
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (email: string): { valid: boolean; error: string } => {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true, error: '' };
};

export const validatePassword = (password: string): { valid: boolean; error: string } => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true, error: '' };
};

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): { valid: boolean; error: string } => {
  if (!confirmPassword) {
    return { valid: false, error: 'Please confirm your password' };
  }
  if (confirmPassword !== password) {
    return { valid: false, error: 'Passwords do not match' };
  }
  return { valid: true, error: '' };
};

export const validateDisplayName = (displayName: string): { valid: boolean; error: string } => {
  if (!displayName || !displayName.trim()) {
    return { valid: false, error: 'Display name is required' };
  }
  if (displayName.length > 100) {
    return { valid: false, error: 'Display name must be 100 characters or less' };
  }
  return { valid: true, error: '' };
};

export const validateRequired = (value: string, fieldName: string): { valid: boolean; error: string } => {
  if (!value || !value.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true, error: '' };
};
