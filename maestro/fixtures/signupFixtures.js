/**
 * The sign-up flows create an email/password account per run as
 * maestro-signup-<stamp>@example.com with username ms-<stamp>. Email sign-ups
 * must verify the address before they can log in, and example.com never
 * delivers mail, so the Auth account can't be signed into or deleted from the
 * app; the cleanup removes its profile doc. The password is a test value for
 * these accounts only.
 */
export const MAESTRO_SIGNUP_EMAIL_PREFIX = "maestro-signup";
export const MAESTRO_SIGNUP_PASSWORD = "Maestro-Signup-2026!";
