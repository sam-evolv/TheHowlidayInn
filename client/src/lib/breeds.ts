// Frontend breed validation utilities using shared logic and settings data

import { normaliseBreed, isBreedProhibited as sharedIsBreedProhibited } from "../../../shared/breeds";
import { api } from '@/lib/api';

// Re-export shared functions for convenience
export { normaliseBreed };

// Fetch prohibited breeds from settings API
let cachedProhibitedBreeds: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getProhibitedBreeds(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedProhibitedBreeds && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedProhibitedBreeds;
  }
  
  try {
    const response = await api.get('/api/settings/public');
    const settings = response.data;
    // Extract from prohibitedBreeds (top-level) or breedPolicy.banned_breeds (nested)
    const breeds = settings.prohibitedBreeds || settings.breedPolicy?.banned_breeds || [];
    cachedProhibitedBreeds = breeds;
    cacheTimestamp = now;
    return breeds;
  } catch (error) {
    console.error('Failed to fetch prohibited breeds from settings:', error);
    // Fallback to empty array if settings fetch fails
    return [];
  }
}

// Check if a breed is banned according to current settings
export async function isBreedProhibited(breedInput: string): Promise<boolean> {
  if (!breedInput || !breedInput.trim()) {
    return false;
  }
  
  const prohibitedBreeds = await getProhibitedBreeds();
  return sharedIsBreedProhibited(breedInput, prohibitedBreeds);
}

// Legacy function for backwards compatibility - now uses settings data
export async function isBanned(input: string): Promise<boolean> {
  return await isBreedProhibited(input);
}