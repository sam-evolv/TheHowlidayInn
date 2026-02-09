// Capacity configuration with environment variable defaults
export const capacityConfig = {
  maxCapacityDaycare: parseInt(process.env.MAX_CAPACITY_DAYCARE || '40', 10),
  maxCapacityBoarding: parseInt(process.env.MAX_CAPACITY_BOARDING || '40', 10),
  maxCapacityTrial: parseInt(process.env.MAX_CAPACITY_TRIAL || '8', 10),
  reservationTTLMin: parseInt(process.env.RESERVATION_TTL_MIN || '10', 10),
};

export function getCapacityForService(service: string): number {
  const normalized = service.toLowerCase();
  if (normalized === 'daycare') return capacityConfig.maxCapacityDaycare;
  if (normalized === 'boarding') return capacityConfig.maxCapacityBoarding;
  if (normalized === 'trial day' || normalized === 'trial') return capacityConfig.maxCapacityTrial;
  
  // Default fallback
  return capacityConfig.maxCapacityDaycare;
}

export function getReservationTTLMinutes(): number {
  return capacityConfig.reservationTTLMin;
}
