// Pure logic for the sign-up availability callables, kept free of Firebase
// imports so it can be unit tested from the app's Jest setup.

export const EMAIL_MAX_LENGTH = 254;
export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 10;

/** Requests allowed per IP per window, shared by both checks. */
export const RATE_LIMIT_MAX_REQUESTS = 60;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/;

const readString = (data: unknown, key: string): string | null => {
  if (typeof data !== "object" || data === null) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
};

/** Returns the trimmed, lowercased email, or null when it isn't valid. */
export function parseEmail(data: unknown): string | null {
  const raw = readString(data, "email");
  if (raw === null) return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX_LENGTH) return null;
  return EMAIL_PATTERN.test(email) ? email : null;
}

/**
 * Returns the lowercased username (users are stored with usernameLower), or
 * null when it breaks the sign-up rules: 4-10 letters, numbers and single
 * dashes, not starting or ending with a dash.
 */
export function parseUsername(data: unknown): string | null {
  const raw = readString(data, "username");
  if (raw === null) return null;
  const username = raw.trim();
  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    return null;
  }
  return USERNAME_PATTERN.test(username) ? username.toLowerCase() : null;
}

export interface RateWindow {
  windowStart: number;
  count: number;
}

/** Next counter state for one more request at `now`. */
export function nextRateWindow(
  current: RateWindow | null,
  now: number,
  windowMs = RATE_LIMIT_WINDOW_MS,
): RateWindow {
  if (!current || now - current.windowStart >= windowMs) {
    return { windowStart: now, count: 1 };
  }
  return { windowStart: current.windowStart, count: current.count + 1 };
}

export const isOverLimit = (
  window: RateWindow,
  max = RATE_LIMIT_MAX_REQUESTS,
) => window.count > max;

/** First address in x-forwarded-for (set by Google's front end), else the socket IP. */
export function clientIp(
  forwardedFor: string | string[] | undefined,
  fallback: string | undefined,
): string {
  const header = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const first = header?.split(",")[0]?.trim();
  return first || fallback || "unknown";
}
