import { describe, it, expect } from 'vitest';
import { calcBoarding_v2, calcDaycare_v2, calcTrial_v2, isPmLabel } from '../../shared/pricing/v2';

describe('Pricing Module v2 (Calendar-based)', () => {
  describe('calcDaycare_v2', () => {
    it('should return flat rate of €20', () => {
      const result = calcDaycare_v2();
      expect(result.total).toBe(20);
      expect(result.model).toBe('calendar_v2');
    });
  });

  describe('calcTrial_v2', () => {
    it('should return flat rate of €20', () => {
      const result = calcTrial_v2();
      expect(result.total).toBe(20);
      expect(result.model).toBe('calendar_v2');
    });
  });

  describe('isPmLabel', () => {
    it('should correctly identify PM time slots', () => {
      expect(isPmLabel('16:00 - 18:00')).toBe(true);
      expect(isPmLabel('17:00 - 19:00')).toBe(true);
      expect(isPmLabel('08:00 - 10:00')).toBe(false);
      expect(isPmLabel('12:00 - 14:00')).toBe(false);
      expect(isPmLabel(undefined)).toBe(false);
      expect(isPmLabel('')).toBe(false);
    });
  });

  describe('calcBoarding_v2 - Calendar-based billing', () => {
    // Acceptance Case A: Mon AM → Tue AM, 1 dog, checkout "08:00 - 10:00" => nights=1, total=€25
    it('Case A: Mon AM → Tue AM, 1 dog, AM checkout => 1 night, €25', () => {
      const checkinISO = '2025-10-20T08:00:00.000Z'; // Monday 8 AM
      const checkoutISO = '2025-10-21T08:00:00.000Z'; // Tuesday 8 AM
      const result = calcBoarding_v2({
        dogCount: 1,
        checkinISO,
        checkoutISO,
        checkoutTimeLabel: '08:00 - 10:00',
      });

      expect(result.nights).toBe(1);
      expect(result.perNight).toBe(25);
      expect(result.pmSurcharge).toBe(0);
      expect(result.total).toBe(25);
      expect(result.model).toBe('calendar_v2');
    });

    // Acceptance Case B: Mon AM → Tue PM, 1 dog, checkout "16:00 - 18:00" => nights=1, total=€35
    it('Case B: Mon AM → Tue PM, 1 dog, PM checkout => 1 night, €35 (€25 + €10 surcharge)', () => {
      const checkinISO = '2025-10-20T08:00:00.000Z'; // Monday 8 AM
      const checkoutISO = '2025-10-21T16:00:00.000Z'; // Tuesday 4 PM
      const result = calcBoarding_v2({
        dogCount: 1,
        checkinISO,
        checkoutISO,
        checkoutTimeLabel: '16:00 - 18:00',
      });

      expect(result.nights).toBe(1);
      expect(result.perNight).toBe(25);
      expect(result.pmSurcharge).toBe(10);
      expect(result.total).toBe(35);
      expect(result.model).toBe('calendar_v2');
    });

    // Acceptance Case C: Fri PM → Sat PM, 2 dogs, checkout "16:00 - 18:00" => nights=1, total=€50 (includes +€10)
    it('Case C: Fri PM → Sat PM, 2 dogs, PM checkout => 1 night, €50 (€40 + €10 surcharge)', () => {
      const checkinISO = '2025-10-24T16:00:00.000Z'; // Friday 4 PM
      const checkoutISO = '2025-10-25T16:00:00.000Z'; // Saturday 4 PM
      const result = calcBoarding_v2({
        dogCount: 2,
        checkinISO,
        checkoutISO,
        checkoutTimeLabel: '16:00 - 18:00',
      });

      expect(result.nights).toBe(1);
      expect(result.perNight).toBe(40);
      expect(result.pmSurcharge).toBe(10);
      expect(result.total).toBe(50);
      expect(result.model).toBe('calendar_v2');
    });

    // Acceptance Case D: Thu AM → Sat AM, 2 dogs => nights=2, total=€80
    it('Case D: Thu AM → Sat AM, 2 dogs, AM checkout => 2 nights, €80', () => {
      const checkinISO = '2025-10-23T08:00:00.000Z'; // Thursday 8 AM
      const checkoutISO = '2025-10-25T08:00:00.000Z'; // Saturday 8 AM
      const result = calcBoarding_v2({
        dogCount: 2,
        checkinISO,
        checkoutISO,
        checkoutTimeLabel: '08:00 - 10:00',
      });

      expect(result.nights).toBe(2);
      expect(result.perNight).toBe(40);
      expect(result.pmSurcharge).toBe(0);
      expect(result.total).toBe(80);
      expect(result.model).toBe('calendar_v2');
    });

    // Acceptance Case E: Sat AM → Sun PM, 1 dog => nights=1, total=€35
    it('Case E: Sat AM → Sun PM, 1 dog, PM checkout => 1 night, €35 (€25 + €10 surcharge)', () => {
      const checkinISO = '2025-10-25T08:00:00.000Z'; // Saturday 8 AM
      const checkoutISO = '2025-10-26T16:00:00.000Z'; // Sunday 4 PM
      const result = calcBoarding_v2({
        dogCount: 1,
        checkinISO,
        checkoutISO,
        checkoutTimeLabel: '16:00 - 18:00',
      });

      expect(result.nights).toBe(1);
      expect(result.perNight).toBe(25);
      expect(result.pmSurcharge).toBe(10);
      expect(result.total).toBe(35);
      expect(result.model).toBe('calendar_v2');
    });

    // Additional edge cases
    it('should calculate week-long stay (7 nights, 2 dogs, PM checkout)', () => {
      const checkinISO = '2025-10-20T09:00:00.000Z';
      const checkoutISO = '2025-10-27T16:00:00.000Z'; // 7 days later
      const result = calcBoarding_v2({
        dogCount: 2,
        checkinISO,
        checkoutISO,
        checkoutTimeLabel: '16:00 - 18:00',
      });

      expect(result.nights).toBe(7);
      expect(result.perNight).toBe(40);
      expect(result.pmSurcharge).toBe(10);
      expect(result.total).toBe(290); // 7 * €40 + €10
    });

    it('should handle same-day checkout (0 calendar days) as minimum 1 night', () => {
      const checkinISO = '2025-10-20T09:00:00.000Z';
      const checkoutISO = '2025-10-20T16:00:00.000Z'; // Same day, PM
      const result = calcBoarding_v2({
        dogCount: 1,
        checkinISO,
        checkoutISO,
        checkoutTimeLabel: '16:00 - 18:00',
      });

      expect(result.nights).toBe(1);
      expect(result.total).toBe(35); // 1 * €25 + €10
    });

    it('should NOT add surcharge for AM checkout regardless of stay length', () => {
      const checkinISO = '2025-10-20T09:00:00.000Z';
      const checkoutISO = '2025-10-21T09:00:00.000Z'; // 1 day later, AM
      const result = calcBoarding_v2({
        dogCount: 1,
        checkinISO,
        checkoutISO,
        checkoutTimeLabel: '08:00 - 10:00',
      });

      expect(result.pmSurcharge).toBe(0);
      expect(result.total).toBe(25);
    });

    it('should always add surcharge for PM checkout (no 48-hour condition)', () => {
      const checkinISO = '2025-10-20T09:00:00.000Z';
      const checkoutISO = '2025-10-27T16:00:00.000Z'; // 7 days later, PM
      const result = calcBoarding_v2({
        dogCount: 1,
        checkinISO,
        checkoutISO,
        checkoutTimeLabel: '16:00 - 18:00',
      });

      // In v2, PM always adds €10 regardless of stay length
      expect(result.pmSurcharge).toBe(10);
      expect(result.total).toBe(185); // 7 * €25 + €10
    });
  });
});
