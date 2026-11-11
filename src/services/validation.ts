export const LIMITS = {
  usernameMin: 3,
  usernameMax: 20,
  passwordMin: 8,
  passwordMax: 72,
  displayNameMax: 30,
  bioMax: 120,
  confessionMax: 500,
  answerMax: 500,
} as const;

const USERNAME_PATTERN = /^[a-z0-9_.]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Names that would be confusing or look official. */
const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'support',
  'help',
  'moderator',
  'winter',
  'confessions',
  'inbox',
  'auth',
  'login',
  'signup',
  'system',
  'root',
]);

/** Lower-cases, trims and drops a leading "@". */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@+/, '').toLowerCase();
}

/** Returns a helpful message, or null when the username is fine. */
export function validateUsername(input: string): string | null {
  const username = normalizeUsername(input);
  if (username.length < LIMITS.usernameMin) {
    return `Usernames need at least ${LIMITS.usernameMin} characters. Add a few more.`;
  }
  if (username.length > LIMITS.usernameMax) {
    return `Usernames can be up to ${LIMITS.usernameMax} characters. Try a shorter one.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Usernames can only use letters, numbers, dots and underscores. Remove spaces and other symbols.';
  }
  if (RESERVED_USERNAMES.has(username)) {
    return 'That username is reserved. Please pick a different one.';
  }
  return null;
}

/** Lower-cases and trims an email address. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Returns a helpful message, or null when the email looks usable. */
export function validateEmail(input: string): string | null {
  const email = normalizeEmail(input);
  if (!email) {
    return 'Add an email address so you can confirm your account and recover it later.';
  }
  if (email.length > 254) {
    return 'That email address is too long. Please check it.';
  }
  if (!EMAIL_PATTERN.test(email)) {
    return 'That email address does not look right. Check for typos.';
  }
  return null;
}

/** Returns a helpful message, or null when the password is fine. */
export function validatePassword(input: string): string | null {
  if (input.length < LIMITS.passwordMin) {
    return `Passwords need at least ${LIMITS.passwordMin} characters. Add a few more to keep your inbox safe.`;
  }
  if (input.length > LIMITS.passwordMax) {
    return `Passwords can be up to ${LIMITS.passwordMax} characters. Please shorten it.`;
  }
  return null;
}

/** Collapses runs of blank lines and trims the text. */
export function cleanText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
