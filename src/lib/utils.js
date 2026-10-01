export const formatINR = (n) => '\u20B9' + Number(n || 0).toLocaleString('en-IN');

// Timestamp | number | null -> milliseconds (pending server timestamps are null locally)
export const ms = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : typeof t === 'number' ? t : Date.now());

export const avgRating = (p) => (p && p.ratingCount > 0 ? p.ratingSum / p.ratingCount : 0);

// trim, strip control characters, cap length. React escapes output, this keeps stored data clean too.
export const clean = (s, max = 200) =>
  String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
export const isPhone = (s) => !s || /^[+]?[0-9\s-]{7,15}$/.test(s);
export const strongPassword = (s) => s.length >= 8 && /[A-Za-z]/.test(s) && /[0-9]/.test(s);

export const timeAgo = (t) => {
  const diff = Math.max(0, Date.now() - ms(t));
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const friendlyError = (e) => {
  const code = e?.code || '';
  const map = {
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
    'auth/weak-password': 'Choose a stronger password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/popup-closed-by-user': 'Sign-in window was closed.',
    'auth/network-request-failed': 'Network problem. Check your connection.',
    'permission-denied': 'You do not have permission to do that.',
    unavailable: 'Service is temporarily unavailable. Try again.',
  };
  return map[code] || map[code.replace('firestore/', '')] || e?.message || 'Something went wrong.';
};
