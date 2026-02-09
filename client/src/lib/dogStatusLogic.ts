// TODO HowlidayInn: Business logic for computing dog verification status
import { EnhancedFirebaseDog, Vaccination, KennelSettings, RequiredVaccine } from './dogProfile';

export interface DogStatusResult {
  status: 'pending' | 'verified' | 'expired' | 'rejected';
  nextExpiry?: string; // ISO date string
  issues?: string[];
}

/**
 * Compute dog verification status based on vaccinations and kennel requirements
 * @param dog - The dog profile
 * @param vaccinations - Array of vaccination records for the dog
 * @param settings - Kennel settings with required vaccines and prohibited breeds
 * @param bookingRange - Optional booking date range to validate coverage
 * @returns Status result with expiry date and any issues
 */
export function computeDogStatus(
  dog: EnhancedFirebaseDog,
  vaccinations: Vaccination[],
  settings: KennelSettings,
  bookingRange?: { start: string; end: string }
): DogStatusResult {
  const issues: string[] = [];
  const today = new Date();
  
  // Check if breed is prohibited (case-insensitive)
  if (dog.breed && settings.prohibitedBreeds.some(breed => breed.toLowerCase() === dog.breed!.toLowerCase())) {
    return {
      status: 'rejected',
      issues: [`Breed "${dog.breed}" is not permitted at our facility`]
    };
  }
  
  // If explicitly rejected by admin, return rejected status
  if (dog.status === 'rejected') {
    return {
      status: 'rejected',
      issues: dog.disallowedReason ? [dog.disallowedReason] : ['Rejected by administrator']
    };
  }
  
  // Check required vaccinations
  const validVaccinations = new Map<string, Vaccination>();
  let earliestExpiry: Date | null = null;
  
  for (const requiredVaccine of settings.requiredVaccines) {
    // Find the most recent vaccination of this type
    const vaccinesOfType = vaccinations
      .filter(v => v.type === requiredVaccine.type && v.verified)
      .sort((a, b) => {
        if (!a.dateAdministered || !b.dateAdministered) return 0;
        return new Date(b.dateAdministered).getTime() - new Date(a.dateAdministered).getTime();
      });
    
    const mostRecentVaccine = vaccinesOfType[0];
    
    if (!mostRecentVaccine) {
      issues.push(`Missing required vaccination: ${requiredVaccine.label}`);
      continue;
    }
    
    if (!mostRecentVaccine.validUntil) {
      issues.push(`${requiredVaccine.label} vaccination is missing expiry date`);
      continue;
    }
    
    const expiryDate = new Date(mostRecentVaccine.validUntil);
    
    // Check if vaccination covers today
    if (expiryDate < today) {
      issues.push(`${requiredVaccine.label} vaccination expired on ${formatDate(expiryDate)}`);
      continue;
    }
    
    // Check if vaccination covers the booking range if specified
    if (bookingRange) {
      const bookingStart = new Date(bookingRange.start);
      const bookingEnd = new Date(bookingRange.end);
      
      if (expiryDate < bookingEnd) {
        issues.push(`${requiredVaccine.label} vaccination expires before booking end date`);
        continue;
      }
    }
    
    validVaccinations.set(requiredVaccine.type, mostRecentVaccine);
    
    // Track the earliest expiry date
    if (!earliestExpiry || expiryDate < earliestExpiry) {
      earliestExpiry = expiryDate;
    }
  }
  
  // Determine final status
  if (issues.length > 0) {
    // Check if any vaccinations are expired vs missing
    const hasExpiredVaccines = issues.some(issue => issue.includes('expired'));
    return {
      status: hasExpiredVaccines ? 'expired' : 'pending',
      issues,
      nextExpiry: earliestExpiry?.toISOString()
    };
  }
  
  // All required vaccinations are valid
  return {
    status: 'verified',
    nextExpiry: earliestExpiry?.toISOString()
  };
}

/**
 * Validate if a dog can be booked for a specific date range
 * @param dog - The dog profile
 * @param vaccinations - Array of vaccination records for the dog
 * @param settings - Kennel settings
 * @param bookingRange - Booking start and end dates
 * @returns Whether booking is valid and any issues
 */
export function validateDogForBooking(
  dog: EnhancedFirebaseDog,
  vaccinations: Vaccination[],
  settings: KennelSettings,
  bookingRange: { start: string; end: string }
): { valid: boolean; issues: string[] } {
  const statusResult = computeDogStatus(dog, vaccinations, settings, bookingRange);
  
  return {
    valid: statusResult.status === 'verified',
    issues: statusResult.issues || []
  };
}

/**
 * Find dogs that will have expired vaccinations within a specified number of days
 * @param dogs - Array of dog profiles
 * @param vaccinations - Map of dog ID to their vaccination records
 * @param settings - Kennel settings
 * @param daysAhead - Number of days to look ahead
 * @returns Array of dogs with expiring vaccinations
 */
export function findDogsWithExpiringVaccinations(
  dogs: EnhancedFirebaseDog[],
  vaccinations: Map<string, Vaccination[]>,
  settings: KennelSettings,
  daysAhead: number
): { dog: EnhancedFirebaseDog; expiringVaccines: string[] }[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
  
  const result: { dog: EnhancedFirebaseDog; expiringVaccines: string[] }[] = [];
  
  for (const dog of dogs) {
    if (!dog.id) continue;
    
    const dogVaccinations = vaccinations.get(dog.id) || [];
    const expiringVaccines: string[] = [];
    
    for (const requiredVaccine of settings.requiredVaccines) {
      const vaccinesOfType = dogVaccinations
        .filter(v => v.type === requiredVaccine.type && v.verified)
        .sort((a, b) => {
          if (!a.dateAdministered || !b.dateAdministered) return 0;
          return new Date(b.dateAdministered).getTime() - new Date(a.dateAdministered).getTime();
        });
      
      const mostRecentVaccine = vaccinesOfType[0];
      
      if (mostRecentVaccine?.validUntil) {
        const expiryDate = new Date(mostRecentVaccine.validUntil);
        if (expiryDate <= cutoffDate) {
          expiringVaccines.push(requiredVaccine.label);
        }
      }
    }
    
    if (expiringVaccines.length > 0) {
      result.push({ dog, expiringVaccines });
    }
  }
  
  return result;
}

/**
 * Update dog status and expiry based on current vaccinations
 * @param dog - The dog profile
 * @param vaccinations - Array of vaccination records for the dog
 * @param settings - Kennel settings
 * @returns Updated dog data
 */
export function recomputeDogStatus(
  dog: EnhancedFirebaseDog,
  vaccinations: Vaccination[],
  settings: KennelSettings
): Partial<EnhancedFirebaseDog> {
  // Don't auto-update rejected status (admin only)
  if (dog.status === 'rejected') {
    return {};
  }
  
  const statusResult = computeDogStatus(dog, vaccinations, settings);
  
  return {
    status: statusResult.status,
    nextExpiry: statusResult.nextExpiry
  };
}

// Helper function to format dates
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}