// TODO HowlidayInn: Dog status computation logic based on vaccination requirements

import { isBreedProhibited } from "../../shared/breeds";

type VaccineReq = { type: string; min_validity_days: number };
type Vacc = { type: string; validUntil?: Date | null };
type Settings = { requiredVaccines: VaccineReq[]; prohibitedBreeds: string[] };

export function computeDogStatus(
  dog: { breed?: string | null },
  vax: Vacc[],
  settings: Settings,
  booking?: { start: Date; end: Date }
) {
  const req = settings.requiredVaccines ?? [];
  const today = new Date();
  
  // Fail-closed: If no vaccination requirements are configured, require manual verification
  if (req.length === 0) {
    return { status: "pending", nextExpiry: null as Date | null };
  }
  
  // Check if all required vaccines are present and meet minimum validity
  for (const r of req) {
    const have = vax.find(v => v.type === r.type && v.validUntil);
    if (!have) return { status: "pending", nextExpiry: null as Date | null };
    
    // Check minimum validity days requirement
    if (r.min_validity_days > 0) {
      const minValidDate = new Date(today.getTime() + (r.min_validity_days * 24 * 60 * 60 * 1000));
      if (have.validUntil! < minValidDate) {
        return { status: "pending", nextExpiry: have.validUntil };
      }
    }
  }
  
  // Get all expiry dates
  const expiries = req
    .map(r => vax.find(v => v.type === r.type)?.validUntil)
    .filter(Boolean) as Date[];
  const nextExpiry = expiries.length ? new Date(Math.min(...expiries.map(d => d.getTime()))) : null;

  // Check if breed is prohibited using shared validation logic
  if (dog.breed && isBreedProhibited(dog.breed, settings.prohibitedBreeds)) {
    return { status: "rejected", nextExpiry };
  }
  
  // Check if any vaccines are expired
  if (expiries.some(d => d <= today)) {
    return { status: "expired", nextExpiry };
  }
  
  // Check if any vaccines expire before booking end date
  if (booking && expiries.some(d => d <= booking.end)) {
    return { status: "expired", nextExpiry };
  }
  
  return { status: "verified", nextExpiry };
}