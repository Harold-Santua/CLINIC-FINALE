export type UserRole = 'admin' | 'doctor' | 'patient';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  /** Firestore `doctors/{id}` document id — required for doctor role + security rules. */
  doctorRecordId?: string;
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  age?: number;
  bloodType?: string;
  symptoms?: string;
  lastLoginAt?: string;
}
