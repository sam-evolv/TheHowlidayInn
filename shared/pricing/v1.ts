// Hours-based pricing model (legacy v1)
export type PickupWindow = 'AM' | 'PM';

export const PRICES = {
  daycareFlatEUR: 20,
  trialFlatEUR: 20,
  boardingNightEUR_1dog: 25,
  boardingNightEUR_2dogs: 40,
  boardingLatePickupEUR: 10,
};

export function diffHoursRoundedUp(startISO: string, endISO: string): number {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const hours = Math.max(0, (end - start) / 36e5);
  return Math.ceil(hours);
}

/**
 * Calculate boarding price using hours-based billing
 * @param dogCount 1 or 2
 * @param checkinISO ISO datetime at drop
 * @param checkoutISO ISO datetime at pickup
 * @param pickupWindow 'AM'|'PM'
 */
export function calcBoarding_v1({
  dogCount,
  checkinISO,
  checkoutISO,
  pickupWindow,
}: {
  dogCount: number;
  checkinISO: string;
  checkoutISO: string;
  pickupWindow?: PickupWindow;
}): { total: number; nights: number; perNight: number; pmSurcharge: number; model: 'hours_v1' } {
  const perNight = dogCount >= 2 ? PRICES.boardingNightEUR_2dogs : PRICES.boardingNightEUR_1dog;
  const hoursRoundedUp = diffHoursRoundedUp(checkinISO, checkoutISO);
  let nights = Math.ceil(hoursRoundedUp / 24);
  if (nights < 1) nights = 1;

  let basePrice = nights * perNight;
  let pmSurcharge = 0;

  // Late pickup surcharge: PM AND actual stay < 48 hours
  const start = new Date(checkinISO).getTime();
  const end = new Date(checkoutISO).getTime();
  const actualHours = Math.max(0, (end - start) / 36e5);
  
  if (pickupWindow === 'PM' && actualHours < 48) {
    pmSurcharge = PRICES.boardingLatePickupEUR;
  }

  return {
    total: basePrice + pmSurcharge,
    nights,
    perNight,
    pmSurcharge,
    model: 'hours_v1',
  };
}

export function calcDaycare_v1(): { total: number; model: 'hours_v1' } {
  return { total: PRICES.daycareFlatEUR, model: 'hours_v1' };
}

export function calcTrial_v1(): { total: number; model: 'hours_v1' } {
  return { total: PRICES.trialFlatEUR, model: 'hours_v1' };
}
