export const RESTRICTED_BREEDS = [
  'pitbull',
  'pit bull',
  'american pitbull terrier',
  'american pit bull terrier',
  'staffordshire terrier',
  'bull terrier',
  'rottweiler',
  'doberman',
  'dobermann',
  'doberman pinscher',
  'chow chow',
  'akita',
  'wolf hybrid',
  'wolfdog',
  'presa canario',
  'cane corso',
  'dogo argentino',
  'fila brasileiro',
  'tosa inu',
  'american bulldog',
  'mastiff'
];

export const SERVICE_TYPES = {
  DAYCARE: 'daycare',
  BOARDING: 'boarding', // Legacy - use BOARDING_SMALL or BOARDING_LARGE
  BOARDING_SMALL: 'boarding:small',
  BOARDING_LARGE: 'boarding:large',
  TRIAL: 'trial'
} as const;

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export const AGE_OPTIONS = [
  { value: 'puppy', label: 'Puppy (under 1 year)' },
  { value: 'young', label: 'Young (1-3 years)' },
  { value: 'adult', label: 'Adult (3-7 years)' },
  { value: 'senior', label: 'Senior (7+ years)' }
];

