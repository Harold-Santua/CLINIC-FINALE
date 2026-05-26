import { Injectable } from '@angular/core';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { User, UserRole } from '../interfaces/user';
import { auth } from '../core/firebase';
import { Firestore } from './firestore';
import { PasswordReset } from './password-reset';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private firebaseUser$ = new BehaviorSubject<FirebaseUser | null>(null);
  private profile$ = new BehaviorSubject<User | null>(null);

  constructor(
    private readonly firestoreService: Firestore,
    private readonly passwordReset: PasswordReset,
  ) {
    onAuthStateChanged(auth, async (fbUser) => {
      this.firebaseUser$.next(fbUser);
      if (!fbUser) {
        this.profile$.next(null);
        return;
      }
      let profile = await this.firestoreService.ensureUserProfile(fbUser.uid, fbUser.email ?? '');
      if (profile.role === 'doctor') {
        await this.firestoreService.ensureDoctorRecordLinked(fbUser.uid, profile.email);
        profile = (await this.firestoreService.getUserById(fbUser.uid)) ?? profile;
      }
      this.profile$.next(profile);
    });
  }

  get currentProfile(): User | null {
    return this.profile$.value;
  }

  watchProfile() {
    return this.profile$.asObservable();
  }

  async register(email: string, password: string, role: UserRole, fullName: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    let user: User | null = null;
    try {
      user = await this.firestoreService.createUserProfileAtomic(credential.user.uid, {
        email: normalizedEmail,
        role,
        fullName,
      });
      if (role === 'doctor') {
        await this.firestoreService.ensureDoctorRecordLinked(credential.user.uid, normalizedEmail);
        user = (await this.firestoreService.getUserById(credential.user.uid)) ?? user;
      }
      this.profile$.next(user);
    } catch (error) {
      await deleteUser(credential.user);
      throw error;
    }
  }

  async login(email: string, password: string, selectedRole: UserRole): Promise<UserRole> {
    const normalizedEmail = email.trim().toLowerCase();
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const fallbackProfile = await this.firestoreService.ensureUserProfile(
      credential.user.uid,
      credential.user.email ?? normalizedEmail,
      selectedRole,
    );
    let profile = fallbackProfile;
    try {
      profile = await this.firestoreService.createLoginSessionAtomic(credential.user.uid, selectedRole);
    } catch (error) {
      await signOut(auth);
      throw error;
    }

    if (profile.role === 'doctor') {
      await this.firestoreService.ensureDoctorRecordLinked(profile.uid, profile.email);
      const refreshed = await this.firestoreService.getUserById(profile.uid);
      this.profile$.next(refreshed ?? profile);
    } else {
      this.profile$.next(profile);
    }
    return profile.role;
  }

  /** Password reset via Auth emulator only. */
  async forgotPassword(email: string) {
    return this.passwordReset.sendResetEmail(email);
  }

  async logout(): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (uid) {
      await this.firestoreService.closeActiveSessions(uid);
    }
    this.profile$.next(null);
    this.firebaseUser$.next(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
      const firebaseKeys = Object.keys(window.localStorage).filter((key) => key.startsWith('firebase:'));
      firebaseKeys.forEach((key) => window.localStorage.removeItem(key));
    }
    await signOut(auth);
  }

  isAuthenticated(): boolean {
    return !!this.firebaseUser$.value;
  }
}
