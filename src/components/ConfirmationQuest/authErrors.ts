// Turn Supabase auth errors into sentences that say what happened and what to do.

interface AuthErrorLike {
  code?: string | null;
  message?: string;
}

const NOT_INVITED = new Set([
  'otp_disabled',
  'signup_disabled',
  'user_not_found',
  'email_address_not_authorized',
]);

export function authMessage(err: AuthErrorLike): string {
  const code = err.code ?? '';
  const message = err.message ?? '';
  if (NOT_INVITED.has(code) || /signups? not allowed/i.test(message)) {
    return "That account isn’t on the invite list. Check the spelling, or ask the game admin which email they invited.";
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Too many sign-in emails in a short time. Wait a minute, then request another.';
  }
  if (code === 'otp_expired') {
    return "That code or link didn’t work, or it has expired. Request a new email.";
  }
  if (code === 'email_address_invalid') {
    return "That doesn’t look like an email address. Check it and try again.";
  }
  return `Sign-in didn’t work. The server said: ${message || code || 'no reason given'}`;
}
