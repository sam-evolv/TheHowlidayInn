export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: number;
};

export type Dog = {
  id: string;
  name: string;
  breed: string;      // user-entered
  breedNorm: string;  // normalised for rules
  dob?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: number;
};