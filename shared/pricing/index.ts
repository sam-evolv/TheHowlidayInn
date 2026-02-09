// Feature-flagged pricing dispatcher
import { calcBoarding_v1, calcDaycare_v1, calcTrial_v1 } from './v1.js';
import { calcBoarding_v2, calcDaycare_v2, calcTrial_v2 } from './v2.js';

export type PricingModel = 'hours_v1' | 'calendar_v2';

export type BoardingInput = {
  dogCount: number;
  checkinISO: string;
  checkoutISO: string;
  checkoutTimeLabel?: string;
  pickupWindow?: 'AM' | 'PM'; // For v1 compatibility
};

export type PricingResult = {
  total: number;
  nights?: number;
  perNight?: number;
  pmSurcharge?: number;
  model: PricingModel;
};

export function computeBoarding(input: BoardingInput, model: PricingModel): PricingResult {
  return model === 'calendar_v2'
    ? calcBoarding_v2(input)
    : calcBoarding_v1(input);
}

export function computeDaycare(model: PricingModel): PricingResult {
  return model === 'calendar_v2'
    ? calcDaycare_v2()
    : calcDaycare_v1();
}

export function computeTrial(model: PricingModel): PricingResult {
  return model === 'calendar_v2'
    ? calcTrial_v2()
    : calcTrial_v1();
}

// Re-export for convenience
export { PRICES } from './v1.js';
export { isPmLabel } from './v2.js';
