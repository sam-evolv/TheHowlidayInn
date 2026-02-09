import { describe, it, expect } from 'vitest';
import { calcBoarding_v1, calcDaycare_v1, calcTrial_v1 } from '../shared/pricing/v1';

describe('Pricing Module v1 (Hours-based) @legacy', () => {
  describe('calcDaycare_v1', () => {
    it('should return flat rate of €20', () => {
      const result = calcDaycare_v1();
      expect(result.total).toBe(20);
      expect(result.model).toBe('hours_v1');
    });
  });

  describe('calcTrial_v1', () => {
    it('should return flat rate of €20', () => {
      const result = calcTrial_v1();
      expect(result.total).toBe(20);
      expect(result.model).toBe('hours_v1');
    });
  });

  describe('calcBoarding_v1', () => {
    describe('1 dog scenarios', () => {
      it('should calculate 1 night, AM pickup = €25 (no late pickup surcharge)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-21T09:00:00.000Z'; // 24 hours later
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'AM');
        
        expect(result.nights).toBe(1);
        expect(result.perNight * result.nights).toBe(25);
        expect(result.pmSurcharge).toBe(0);
        expect(result.total).toBe(25);
      });

      it('should calculate 1 night, PM pickup = €35 (€25 + €10 late pickup)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-21T16:00:00.000Z'; // Next day PM
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'PM');
        
        expect(result.nights).toBe(1);
        expect(result.perNight * result.nights).toBe(25);
        expect(result.pmSurcharge).toBe(10);
        expect(result.total).toBe(35);
      });

      it('should calculate 2 nights, AM pickup = €50 (2 * €25)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-22T09:00:00.000Z'; // 48 hours later
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'AM');
        
        expect(result.nights).toBe(2);
        expect(result.perNight * result.nights).toBe(50);
        expect(result.pmSurcharge).toBe(0);
        expect(result.total).toBe(50);
      });

      it('should calculate 2 nights, PM pickup = €60 (2 * €25 + €10)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-22T16:00:00.000Z'; // Day 3 PM
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'PM');
        
        expect(result.nights).toBe(2);
        expect(result.perNight * result.nights).toBe(50);
        expect(result.pmSurcharge).toBe(10);
        expect(result.total).toBe(60);
      });

      it('should round up partial days to full nights (25 hours = 2 nights)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-21T10:00:00.000Z'; // 25 hours later
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'AM');
        
        expect(result.nights).toBe(2);
        expect(result.perNight * result.nights).toBe(50);
        expect(result.total).toBe(50);
      });

      it('should calculate minimum 1 night even for short stays', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-20T15:00:00.000Z'; // 6 hours later
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'AM');
        
        expect(result.nights).toBe(1);
        expect(result.perNight * result.nights).toBe(25);
        expect(result.total).toBe(25);
      });
    });

    describe('2 dogs scenarios', () => {
      it('should calculate 1 night, AM pickup = €40 (no late pickup surcharge)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-21T09:00:00.000Z'; // 24 hours later
        const result = calcBoarding_v1(2, dropISO, pickupISO, 'AM');
        
        expect(result.nights).toBe(1);
        expect(result.perNight * result.nights).toBe(40);
        expect(result.pmSurcharge).toBe(0);
        expect(result.total).toBe(40);
      });

      it('should calculate 1 night, PM pickup = €50 (€40 + €10 late pickup)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-21T16:00:00.000Z'; // Next day PM
        const result = calcBoarding_v1(2, dropISO, pickupISO, 'PM');
        
        expect(result.nights).toBe(1);
        expect(result.perNight * result.nights).toBe(40);
        expect(result.pmSurcharge).toBe(10);
        expect(result.total).toBe(50);
      });

      it('should calculate 2 nights, AM pickup = €80 (2 * €40)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-22T09:00:00.000Z'; // 48 hours later
        const result = calcBoarding_v1(2, dropISO, pickupISO, 'AM');
        
        expect(result.nights).toBe(2);
        expect(result.perNight * result.nights).toBe(80);
        expect(result.pmSurcharge).toBe(0);
        expect(result.total).toBe(80);
      });

      it('should calculate 3 nights, PM pickup = €130 (3 * €40 + €10)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-23T16:00:00.000Z'; // Day 4 PM
        const result = calcBoarding_v1(2, dropISO, pickupISO, 'PM');
        
        expect(result.nights).toBe(3);
        expect(result.perNight * result.nights).toBe(120);
        expect(result.pmSurcharge).toBe(10);
        expect(result.total).toBe(130);
      });
    });

    describe('late pickup surcharge logic', () => {
      it('should NOT apply surcharge when staying 2+ full nights (48+ hours) regardless of pickup window', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-22T16:00:00.000Z'; // 55 hours later, PM pickup
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'PM');
        
        // 55 hours / 24 = 2.29 nights, rounds up to 3 nights
        // With 3 nights, no late pickup surcharge applies
        expect(result.nights).toBe(3);
        expect(result.pmSurcharge).toBe(0);
        expect(result.total).toBe(75); // 3 * €25, no surcharge
      });

      it('should apply surcharge for 1 night PM pickup (not a full 48+ hour stay)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-21T16:00:00.000Z'; // 31 hours later, PM pickup
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'PM');
        
        // 31 hours / 24 = 1.29 nights, rounds up to 2 nights
        // But only 31 hours < 48, so surcharge applies
        expect(result.nights).toBe(2);
        expect(result.pmSurcharge).toBe(10);
        expect(result.total).toBe(60); // 2 * €25 + €10
      });

      it('should NOT apply surcharge for AM pickup regardless of hours', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-21T09:00:00.000Z'; // 24 hours, AM
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'AM');
        
        expect(result.pmSurcharge).toBe(0);
      });

      it('should handle exactly 48 hours (2 full nights) correctly - no surcharge', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-22T09:00:00.000Z'; // Exactly 48 hours
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'PM');
        
        expect(result.nights).toBe(2);
        expect(result.pmSurcharge).toBe(0);
        expect(result.total).toBe(50);
      });

      it('should apply surcharge for fractional hours just under 48h (47.5h) with PM pickup', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-22T08:30:00.000Z'; // 47.5 hours later (exactly 30 mins before 48h)
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'PM');
        
        // 47.5 hours rounds up to 48, then ceil(48/24) = 2 nights
        // But actual duration 47.5 < 48, so surcharge SHOULD apply for PM pickup
        expect(result.nights).toBe(2);
        expect(result.perNight * result.nights).toBe(50);
        expect(result.pmSurcharge).toBe(10);
        expect(result.total).toBe(60); // 2 * €25 + €10 surcharge
      });

      it('should NOT apply surcharge for fractional hours just over 48h (48.5h) with PM pickup', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-22T09:30:00.000Z'; // 48.5 hours later
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'PM');
        
        // 48.5 hours rounds up to 49, then ceil(49/24) = 3 nights
        // Actual duration 48.5 >= 48, so NO surcharge even with PM pickup
        expect(result.nights).toBe(3);
        expect(result.perNight * result.nights).toBe(75);
        expect(result.pmSurcharge).toBe(0);
        expect(result.total).toBe(75); // 3 * €25, no surcharge
      });
    });

    describe('edge cases', () => {
      it('should handle same day pickup (0 hours) as minimum 1 night', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-20T09:00:00.000Z'; // Same time
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'AM');
        
        expect(result.nights).toBe(1);
        expect(result.total).toBe(25);
      });

      it('should handle negative time difference as minimum 1 night', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-19T09:00:00.000Z'; // Pickup before drop (shouldn\'t happen but testing robustness)
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'AM');
        
        expect(result.nights).toBe(1);
        expect(result.total).toBe(25);
      });

      it('should handle week-long stay (7 nights, 2 dogs, PM pickup)', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-27T16:00:00.000Z'; // 7 days + 7 hours later
        const result = calcBoarding_v1(2, dropISO, pickupISO, 'PM');
        
        expect(result.nights).toBe(8); // 175 hours / 24 = 7.29, rounds up to 8
        expect(result.perNight * result.nights).toBe(320); // 8 * €40
        expect(result.pmSurcharge).toBe(0); // 175 hours > 48
        expect(result.total).toBe(320);
      });
    });

    describe('pricing constants validation', () => {
      it('should use correct per-night pricing: €25 for 1 dog, €40 for 2 dogs', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-21T09:00:00.000Z';
        
        const result1Dog = calcBoarding_v1(1, dropISO, pickupISO, 'AM');
        const result2Dogs = calcBoarding_v1(2, dropISO, pickupISO, 'AM');
        
        expect(result1Dog.basePrice / result1Dog.nights).toBe(25);
        expect(result2Dogs.basePrice / result2Dogs.nights).toBe(40);
      });

      it('should use correct late pickup surcharge: €10 flat', () => {
        const dropISO = '2025-10-20T09:00:00.000Z';
        const pickupISO = '2025-10-21T16:00:00.000Z';
        
        const result = calcBoarding_v1(1, dropISO, pickupISO, 'PM');
        
        expect(result.pmSurcharge).toBe(10);
      });
    });
  });
});
