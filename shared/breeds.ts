// Shared breed validation logic for consistent policy enforcement

export function normaliseBreed(input: string): string {
  const s = input.trim().toLowerCase();
  const synonyms: Record<string,string> = {
    "doberman pinscher": "doberman",
    "gsd": "german shepherd",
    "staffy": "staffordshire bull terrier",
    "staffie": "staffordshire bull terrier",
    "pitbull": "pit bull",
    "pitbull terrier": "pit bull",
    "american pit bull terrier": "pit bull",
    "st bernard": "saint bernard",
    "st. bernard": "saint bernard",
    "ridgeback": "rhodesian ridgeback",
    "kerry blue": "kerry blue terrier",
    "american bully xl": "xl bully",
    "bully xl": "xl bully",
    "american staffordshire terrier": "staffordshire bull terrier",
    "bull mastiff": "bullmastiff",
    "english bull terrier": "bull terrier",
    "japanese tosa": "tosa",
    "dogo argentino": "dogo",
    "fila brasileiro": "fila",
  };
  return synonyms[s] ?? s;
}

// Check if a breed is prohibited according to given prohibited breeds list
export function isBreedProhibited(breedInput: string, prohibitedBreeds: string[]): boolean {
  if (!breedInput || !breedInput.trim()) {
    return false;
  }
  
  const normalizedInput = normaliseBreed(breedInput);
  
  // Check against prohibited breeds (case-insensitive with normalization)
  return prohibitedBreeds.some(banned => {
    const normalizedBanned = normaliseBreed(banned);
    
    // Exact match after normalization
    if (normalizedInput === normalizedBanned) {
      return true;
    }
    
    // Substring matches (either direction) to catch mixes and partial breeds
    if (normalizedInput.includes(normalizedBanned) || normalizedBanned.includes(normalizedInput)) {
      return true;
    }
    
    // Check for "mix" patterns like "pit bull mix", "german shepherd cross"
    const inputWords = normalizedInput.split(/\s+/);
    const bannedWords = normalizedBanned.split(/\s+/);
    
    // If any significant word from banned breed appears in input, flag it
    return bannedWords.some(bannedWord => 
      bannedWord.length > 2 && inputWords.some(inputWord => 
        inputWord.includes(bannedWord) || bannedWord.includes(inputWord)
      )
    );
  });
}