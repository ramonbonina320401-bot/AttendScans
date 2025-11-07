// Brute-force protection utility
// Tracks failed login attempts and enforces lockout

interface AttemptRecord {
  count: number;
  lockoutUntil: number | null;
}

const MAX_ATTEMPTS = 4;
const LOCKOUT_DURATION = 3 * 60 * 1000; // 3 minutes in milliseconds

// Get attempt key based on identifier (email or user ID)
const getAttemptKey = (identifier: string, type: 'login' | 'password-change'): string => {
  return `attempt_${type}_${identifier.toLowerCase()}`;
};

// Get current attempt record from localStorage
const getAttemptRecord = (identifier: string, type: 'login' | 'password-change'): AttemptRecord => {
  const key = getAttemptKey(identifier, type);
  const stored = localStorage.getItem(key);
  
  if (!stored) {
    return { count: 0, lockoutUntil: null };
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return { count: 0, lockoutUntil: null };
  }
};

// Save attempt record to localStorage
const saveAttemptRecord = (identifier: string, type: 'login' | 'password-change', record: AttemptRecord): void => {
  const key = getAttemptKey(identifier, type);
  localStorage.setItem(key, JSON.stringify(record));
};

// Check if currently locked out
export const isLockedOut = (identifier: string, type: 'login' | 'password-change' = 'login'): { locked: boolean; remainingTime: number } => {
  if (!identifier) {
    return { locked: false, remainingTime: 0 };
  }
  
  const record = getAttemptRecord(identifier, type);
  
  if (record.lockoutUntil && Date.now() < record.lockoutUntil) {
    const remainingTime = Math.ceil((record.lockoutUntil - Date.now()) / 1000);
    return { locked: true, remainingTime };
  }
  
  // Lockout expired, reset the record
  if (record.lockoutUntil && Date.now() >= record.lockoutUntil) {
    saveAttemptRecord(identifier, type, { count: 0, lockoutUntil: null });
  }
  
  return { locked: false, remainingTime: 0 };
};

// Record a failed attempt
export const recordFailedAttempt = (identifier: string, type: 'login' | 'password-change' = 'login'): { locked: boolean; attemptsLeft: number; lockoutUntil: number | null } => {
  if (!identifier) {
    return { locked: false, attemptsLeft: MAX_ATTEMPTS, lockoutUntil: null };
  }
  
  const record = getAttemptRecord(identifier, type);
  
  // Increment attempt count
  record.count += 1;
  
  // Check if we've hit the max attempts
  if (record.count >= MAX_ATTEMPTS) {
    record.lockoutUntil = Date.now() + LOCKOUT_DURATION;
    saveAttemptRecord(identifier, type, record);
    return { locked: true, attemptsLeft: 0, lockoutUntil: record.lockoutUntil };
  }
  
  // Save updated count
  saveAttemptRecord(identifier, type, record);
  
  return { 
    locked: false, 
    attemptsLeft: MAX_ATTEMPTS - record.count, 
    lockoutUntil: null 
  };
};

// Clear attempts after successful login/action
export const clearAttempts = (identifier: string, type: 'login' | 'password-change' = 'login'): void => {
  if (!identifier) return;
  
  const key = getAttemptKey(identifier, type);
  localStorage.removeItem(key);
};

// Get remaining attempts
export const getRemainingAttempts = (identifier: string, type: 'login' | 'password-change' = 'login'): number => {
  if (!identifier) {
    return MAX_ATTEMPTS;
  }
  
  const record = getAttemptRecord(identifier, type);
  
  // If locked out, return 0
  if (record.lockoutUntil && Date.now() < record.lockoutUntil) {
    return 0;
  }
  
  return MAX_ATTEMPTS - record.count;
};

// Format remaining time as MM:SS
export const formatRemainingTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
