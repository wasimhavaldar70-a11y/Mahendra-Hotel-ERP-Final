// ========================================================
// StayDesk CRM / HotelFlow CRM Password Strength Validator
// Location: lib/passwordStrength.ts
// ========================================================

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'strong';
  score: number; // 0-4
}

/**
 * Validates a password against business-grade requirements.
 * Min 8 chars, must contain uppercase, lowercase, and a number.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('At least one number');
  }

  // Score: 0 = empty, 1 = only length, 2 = length+case, 3 = all basic, 4 = all + special
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++; // bonus for special chars

  let strength: PasswordValidationResult['strength'] = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 2) strength = 'fair';

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/** Returns a simple API-safe error message for backend validation */
export function passwordValidationMessage(password: string): string | null {
  const result = validatePassword(password);
  if (result.valid) return null;
  return `Password must have: ${result.errors.join(', ')}`;
}
