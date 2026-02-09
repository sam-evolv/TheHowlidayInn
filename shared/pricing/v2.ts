// Calendar-based pricing model (v2)
export const PRICES = {
  daycareFlatEUR: 20,
  trialFlatEUR: 20,
  boardingNightEUR_1dog: 25,
  boardingNightEUR_2dogs: 40,
  boardingLatePickupEUR: 10,
};

/**
 * Check if a time slot label indicates PM (16:00 or later)
 */
export function isPmLabel(s?: string): boolean {
  if (!s) return false;
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return parseInt(m[1], 10) >= 16;
  return false;
}

/**
 * Extract date-only (midnight local time) from ISO string
 */
function dateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Calculate calendar nights between two dates (minimum 1)
 */
function nightsBetween(checkinISO: string, checkoutISO: string): number {
  const a = dateOnly(checkinISO).getTime();
  const b = dateOnly(checkoutISO).getTime();
  const diffDays = Math.round((b - a) / 86400000);
  return Math.max(1, diffDays);
}

/**
 * Calculate boarding price using calendar-day billing
 * PM checkout always adds €10 surcharge
 */
export function calcBoarding_v2({
  dogCount,
  checkinISO,
  checkoutISO,
  checkoutTimeLabel,
}: {
  dogCount: number;
  checkinISO: string;
  checkoutISO: string;
  checkoutTimeLabel?: string;
}): { total: number; nights: number; perNight: number; pmSurcharge: number; model: 'calendar_v2' } {
  const perNight = dogCount >= 2 ? PRICES.boardingNightEUR_2dogs : PRICES.boardingNightEUR_1dog;
  const nights = nightsBetween(checkinISO, checkoutISO);
  const pmSurcharge = isPmLabel(checkoutTimeLabel) ? PRICES.boardingLatePickupEUR : 0;
  const total = nights * perNight + pmSurcharge;

  return {
    total,
    nights,
    perNight,
    pmSurcharge,
    model: 'calendar_v2',
  };
}

export function calcDaycare_v2(): { total: number; model: 'calendar_v2' } {
  return { total: PRICES.daycareFlatEUR, model: 'calendar_v2' };
}

export function calcTrial_v2(): { total: number; model: 'calendar_v2' } {
  return { total: PRICES.trialFlatEUR, model: 'calendar_v2' };
}
