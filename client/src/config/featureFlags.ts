/**
 * Christmas Booking Pause Feature
 * 
 * Temporary feature to pause new client onboarding during the Christmas period.
 * Set ENABLED to false to fully revert to normal operations.
 * 
 * To disable: Change ENABLED to false and redeploy
 * To adjust reopen date: Change REOPEN_DATE_ISO (no code changes needed)
 */

export const BOOKING_PAUSE = {
  // Main feature flag - set to false to disable the entire pause feature
  ENABLED: import.meta.env.VITE_BOOKING_PAUSE_ENABLED === 'true' 
    || import.meta.env.VITE_BOOKING_PAUSE_ENABLED === undefined 
    ? true 
    : false,
  
  // Date when booking pause will automatically lift
  REOPEN_DATE_ISO: import.meta.env.VITE_REOPEN_DATE_ISO || '2026-01-06',
  
  // Banner copy for existing customers
  BANNER_COPY: import.meta.env.VITE_BOOKING_PAUSE_BANNER_COPY || 
    'New client onboarding is paused until after Christmas. Existing customers may continue to book.',
  
  // Copy shown when trial days are unavailable
  TRIAL_DAY_COPY: import.meta.env.VITE_TRIAL_DAY_COPY || 
    'Trial days are currently unavailable. Please check back after Christmas.',
  
  // Testing override - allows bypassing the gate with ?override=1 in URL
  ALLOW_OVERRIDE: import.meta.env.DEV || import.meta.env.VITE_ALLOW_PAUSE_OVERRIDE === 'true',
} as const;

/**
 * Check if URL has override parameter for testing
 */
export function hasBookingPauseOverride(): boolean {
  if (!BOOKING_PAUSE.ALLOW_OVERRIDE) return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('override') === '1';
}

/**
 * Check if booking pause is currently active
 */
export function isBookingPauseActive(): boolean {
  if (!BOOKING_PAUSE.ENABLED) return false;
  if (hasBookingPauseOverride()) return false;
  
  // Check if we've passed the reopen date
  const now = new Date();
  const reopenDate = new Date(BOOKING_PAUSE.REOPEN_DATE_ISO);
  
  return now < reopenDate;
}
