export const BANNED_BREEDS = [
  'American Pit Bull Terrier','English Bull Terrier','Staffordshire Bull Terrier',
  'American Staffordshire Terrier','Bull Mastiff','Doberman Pinscher','German Shepherd',
  'Rottweiler','Japanese Tosa','Dogo Argentino','Fila Brasileiro','Bandog'
].map(b => b.toLowerCase());

export const isBannedBreed = (breed: string) =>
  BANNED_BREEDS.includes((breed || '').trim().toLowerCase());

export const monthsFromDob = (iso: string) => {
  if (!iso) return 0;
  const d = new Date(iso); const now = new Date();
  return (now.getFullYear()-d.getFullYear())*12 + (now.getMonth()-d.getMonth());
};