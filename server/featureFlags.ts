/**
 * Server-side Christmas Booking Pause Feature Flags
 * 
 * Validates booking pause rules on the server to prevent bypassing client-side gates
 */

export const BOOKING_PAUSE = {
  // Main feature flag - set to false to disable the entire pause feature
  ENABLED: process.env.VITE_BOOKING_PAUSE_ENABLED === 'true' 
    || process.env.VITE_BOOKING_PAUSE_ENABLED === undefined
    ? true
    : false,
  
  // Date when booking pause will automatically lift
  REOPEN_DATE_ISO: process.env.VITE_REOPEN_DATE_ISO || '2026-01-06',
  
  // Copy for error messages
  TRIAL_DAY_COPY: process.env.VITE_TRIAL_DAY_COPY || 
    'Trial days are currently unavailable. Please check back after Christmas.',
  
  // Testing override - allows bypassing the gate with special header
  ALLOW_OVERRIDE: process.env.NODE_ENV === 'development',
} as const;

/**
 * Check if booking pause is currently active (server-side)
 */
export function isBookingPauseActive(overrideHeader?: string): boolean {
  if (!BOOKING_PAUSE.ENABLED) return false;
  
  // Check for override in development
  if (BOOKING_PAUSE.ALLOW_OVERRIDE && overrideHeader === '1') {
    return false;
  }
  
  // Check if we've passed the reopen date
  const now = new Date();
  const reopenDate = new Date(BOOKING_PAUSE.REOPEN_DATE_ISO);
  
  return now < reopenDate;
}

/**
 * Validate that trial bookings are allowed
 * Throws error if pause is active
 */
export function validateTrialBooking(overrideHeader?: string): void {
  if (isBookingPauseActive(overrideHeader)) {
    throw new Error(BOOKING_PAUSE.TRIAL_DAY_COPY);
  }
}

/**
 * Validate that daycare/boarding bookings are allowed during pause
 * During pause, requires explicit confirmation that trial was completed
 */
export function validateDaycareOrBoardingBooking(
  trialCompleted: boolean | undefined,
  overrideHeader?: string
): void {
  if (!isBookingPauseActive(overrideHeader)) {
    // Not in pause mode, allow all bookings
    return;
  }
  
  // During pause, require explicit trial completion confirmation
  if (!trialCompleted) {
    throw new Error('Trial day completion confirmation required during the holiday period.');
  }
}
