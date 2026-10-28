// Central input validation. Used by every form BEFORE data reaches the database
// (the database enforces the same rules again with CHECK constraints).
export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Include at least one letter and one number.';
  }
  return null;
}

export function validateName(name: string): string | null {
  const n = name.trim();
  if (!n) return 'Full name is required.';
  if (n.length < 2) return 'Name is too short.';
  if (n.length > 80) return 'Name must be 80 characters or fewer.';
  return null;
}

export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score++;
  if (password.length >= 12 || /[^A-Za-z0-9]/.test(password)) score++;
  return score as 0 | 1 | 2 | 3;
}

export type EventInput = {
  title: string;
  venue: string;
  description: string;
  start: Date;
  end: Date;
};

export function validateEvent(input: EventInput, isNew: boolean): FieldErrors<keyof EventInput> {
  const errors: FieldErrors<keyof EventInput> = {};
  const title = input.title.trim();
  if (title.length < 3) errors.title = 'Title must be at least 3 characters.';
  else if (title.length > 100) errors.title = 'Title must be 100 characters or fewer.';

  const venue = input.venue.trim();
  if (venue.length < 2) errors.venue = 'Venue is required.';
  else if (venue.length > 100) errors.venue = 'Venue must be 100 characters or fewer.';

  if (input.description.trim().length > 500) {
    errors.description = 'Description must be 500 characters or fewer.';
  }
  if (Number.isNaN(input.start.getTime())) errors.start = 'Pick a valid start.';
  if (Number.isNaN(input.end.getTime())) errors.end = 'Pick a valid end.';
  if (!errors.start && !errors.end) {
    if (input.end.getTime() <= input.start.getTime()) errors.end = 'End must be after the start.';
    else if (isNew && input.end.getTime() < Date.now()) errors.end = 'End time is already in the past.';
  }
  return errors;
}

export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Wrong email or password.';
  if (m.includes('email not confirmed')) return 'Confirm your email first, then sign in.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists.';
  }
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('network') || m.includes('fetch')) return 'No connection. Check your internet and retry.';
  return message;
}
