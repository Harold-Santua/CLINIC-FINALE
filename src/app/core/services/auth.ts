import { Injectable } from '@angular/core';
import {
  User,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { auth, db } from '../firebase';

export type UserRole = 'admin' | 'doctor' | 'patient';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  createdAt?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  currentUser: User | null = null;
  currentRole: UserRole | null = null;

  constructor() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (!user) {
        this.currentRole = null;
        return;
      }

      const profile = await this.getUserProfile(user.uid);
      this.currentRole = profile?.role ?? null;
    });
  }

  async login(email: string, password: string, selectedRole: UserRole): Promise<void> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const existingProfile = await this.getUserProfile(credential.user.uid);

    if (!existingProfile) {
      await this.createProfile(credential.user.uid, credential.user.email ?? email, selectedRole);
      this.currentRole = selectedRole;
      return;
    }

    if (existingProfile.role !== selectedRole) {
      await signOut(auth);
      throw new Error('Selected role does not match this account.');
    }

    this.currentRole = existingProfile.role;
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  async forgotPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  hasRole(role: string): boolean {
    return this.currentRole === role;
  }

  getRedirectRoute(role: UserRole): string {
    return `/${role}`;
  }

  getCurrentUserId(): string | null {
    return this.currentUser?.uid ?? null;
  }

  watchUsersByRole(role: UserRole): Observable<UserProfile[]> {
    const usersRef = collection(db, 'users');
    const roleQuery = query(usersRef, where('role', '==', role));

    return new Observable<UserProfile[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        roleQuery,
        (snapshot) => {
          const users = snapshot.docs.map((entry) => entry.data() as UserProfile);
          subscriber.next(users);
        },
        (error) => subscriber.error(error),
      );

      return () => unsubscribe();
    });
  }

  private async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDocRef = doc(db, 'users', uid);
    const userSnapshot = await getDoc(userDocRef);

    if (!userSnapshot.exists()) {
      return null;
    }

    return userSnapshot.data() as UserProfile;
  }

  private async createProfile(uid: string, email: string, role: UserRole): Promise<void> {
    const profile: UserProfile = {
      uid,
      email,
      role,
      displayName: email.split('@')[0],
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', uid), profile);
  }
}
