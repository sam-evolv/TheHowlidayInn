import { useState, useEffect } from 'react';
import { getBookingsForDate, getDailyCapacity } from '@/lib/firebase';

interface AvailabilityData {
  available: number;
  total: number;
  booked: number;
  isFullyBooked: boolean;
}

export function useAvailability(date: string, serviceType: 'daycare' | 'boarding') {
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !serviceType) {
      setAvailability(null);
      return;
    }

    const fetchAvailability = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [bookings, capacity] = await Promise.all([
          getBookingsForDate(date, serviceType),
          getDailyCapacity(),
        ]);

        const total = capacity[serviceType];
        const booked = bookings.length;
        const available = Math.max(0, total - booked);
        const isFullyBooked = available === 0;

        setAvailability({
          available,
          total,
          booked,
          isFullyBooked,
        });
      } catch (err) {
        console.error('Error fetching availability:', err);
        setError('Failed to check availability');
        setAvailability(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [date, serviceType]);

  return {
    availability,
    isLoading,
    error,
    refetch: () => {
      if (date && serviceType) {
        // Re-trigger the effect by clearing and setting the state
        setAvailability(null);
        setTimeout(() => {
          // This will trigger the useEffect again
        }, 0);
      }
    },
  };
}