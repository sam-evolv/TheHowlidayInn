// Storage types for database operations

export interface Booking {
  id: string;
  customerId?: string | null;
  dogId?: string | null;
  dogName?: string | null;
  breed?: string | null;
  age?: string | null;
  weight?: number | null;
  ownerName?: string | null;
  email?: string | null;
  phone?: string | null;
  serviceType: string;
  serviceDate?: string | null;
  checkinDate?: string | null;
  checkoutDate?: string | null;
  trialDate?: string | null;
  dropoffTime?: string | null;
  pickupTime?: string | null;
  checkinTime?: string | null;
  checkoutTime?: string | null;
  alternativeDate?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  vaccinationDate?: string | null;
  vaccinationType?: string | null;
  vaccinationRecordUrl?: string | null;
  status?: string;
  paymentStatus?: string;
  paymentIntentId?: string | null;
  stripeSessionId?: string | null;
  amount?: number | null;
  currency?: string;
  trialCompleted?: boolean;
  notes?: string | null;
  createdAt?: Date | string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string;
  firebaseUid?: string | null;
  isFirstTime?: boolean;
  createdAt?: Date | string;
}

export interface Dog {
  id: string;
  customerId: string;
  name: string;
  breed: string;
  age?: string | null;
  weight?: number | null;
  photoUrl?: string | null;
  temperamentNotes?: string | null;
  vaccinationRecordUrl?: string | null;
  createdAt?: Date | string;
}

export type InsertDog = Omit<Dog, 'id' | 'createdAt'>;
