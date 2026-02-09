/**
 * Operating Hours Policy
 * Centralized configuration for drop-off/pick-up time windows
 */

export interface TimeWindow {
  start: string; // HH:mm format
  end: string;   // HH:mm format
  label?: string; // Display label
}

/**
 * Get available time windows for a given date
 * @param date - Date to check windows for
 * @returns Array of available time windows
 */
export function getDailyWindows(date: Date): TimeWindow[] {
  const day = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  
  // Sunday: 16:00–18:00 ONLY (afternoon pickup window)
  if (day === 0) {
    return [{ start: "16:00", end: "18:00", label: "16:00 - 18:00" }];
  }
  
  // Saturday: 09:00–11:00 or 16:00–18:00
  if (day === 6) {
    return [
      { start: "09:00", end: "11:00", label: "09:00 - 11:00" },
      { start: "16:00", end: "18:00", label: "16:00 - 18:00" }
    ];
  }
  
  // Mon, Tue, Wed, Thu, Fri: 08:00–10:00 or 16:00–18:00
  return [
    { start: "08:00", end: "10:00", label: "08:00 - 10:00" },
    { start: "16:00", end: "18:00", label: "16:00 - 18:00" }
  ];
}

/**
 * Check if a specific time slot is valid for a given date
 * @param date - Date to check
 * @param timeSlot - Time slot in "HH:mm" format or range like "08:00-10:00"
 * @returns true if the time slot is valid for the date
 */
export function isTimeSlotValid(date: Date, timeSlot: string): boolean {
  const windows = getDailyWindows(date);
  
  if (windows.length === 0) {
    return false; // Sunday - closed
  }
  
  // Normalize timeSlot format (handle both "HH:mm" and "HH:mm-HH:mm" formats)
  const normalizedSlot = timeSlot.trim();
  
  return windows.some(window => {
    // Check if slot matches window start time
    if (normalizedSlot === window.start) return true;
    
    // Check if slot matches full range format
    if (normalizedSlot === `${window.start}-${window.end}`) return true;
    
    // Check if slot matches label format
    if (window.label && normalizedSlot === window.label) return true;
    
    return false;
  });
}

/**
 * Get day name from date
 * @param date - Date object
 * @returns Day name (e.g., "Monday", "Wednesday")
 */
export function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Check if a date is closed
 * @param date - Date to check
 * @returns true if the facility is closed on this date
 */
export function isClosed(date: Date): boolean {
  return false; // We're now open 7 days a week with afternoon pickup on Sunday
}

/**
 * Check if a date is a weekend
 * @param date - Date to check
 * @returns true if Saturday or Sunday
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Get a user-friendly message for closed days
 * @param date - Date that is closed
 * @returns Message explaining why booking is not available
 */
export function getClosedMessage(date: Date): string {
  return "This date is not available for booking.";
}
