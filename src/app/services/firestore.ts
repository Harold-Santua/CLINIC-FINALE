import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { Appointment, appointmentBlocksSchedule, displayAppointmentStatus } from '../interfaces/appointment';
import { Doctor } from '../interfaces/doctor';
import { User, UserRole } from '../interfaces/user';
import {
  blockEndTime,
  blocksOverlap,
  slotBlocksActiveAppointment,
} from './appointment-schedule.util';
import { db } from '../core/firebase';

@Injectable({
  providedIn: 'root',
})
export class Firestore {
  private usersRef = collection(db, 'users');
  private userEmailsRef = collection(db, 'userEmails');
  private doctorsRef = collection(db, 'doctors');
  private appointmentsRef = collection(db, 'appointments');
  private loginHistoryRef = collection(db, 'loginHistory');
  private loginSessionsRef = collection(db, 'loginSessions');
  private doctorSchedulesRef = collection(db, 'doctorSchedules');
  private medicalRecordsRef = collection(db, 'medicalRecords');
  private appointmentSlotsRef = collection(db, 'appointmentSlots');
  private patientAppointmentSlotsRef = collection(db, 'patientAppointmentSlots');
  private doctorNotificationsRef = collection(db, 'doctorNotifications');
  private patientAppointmentHistoryRef = collection(db, 'patientAppointmentHistory');

  async ensureUserProfile(uid: string, email: string, role: UserRole = 'patient'): Promise<User> {
    const ref = doc(db, 'users', uid);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      return snapshot.data() as User;
    }
    return this.createUserProfileAtomic(uid, { email, role, fullName: email.split('@')[0] });
  }

  async getUserById(uid: string): Promise<User | null> {
    const snapshot = await getDoc(doc(db, 'users', uid));
    return snapshot.exists() ? (snapshot.data() as User) : null;
  }

  /** Links Auth user to `doctors` collection id (email match). Idempotent. */
  async persistDoctorRecordId(uid: string, doctorRecordId: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), { doctorRecordId });
  }

  async ensureDoctorRecordLinked(uid: string, email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return;
    }
    const user = userSnap.data() as User;
    if (user.role !== 'doctor') {
      return;
    }
    if (user.doctorRecordId) {
      const linkedRef = doc(this.doctorsRef, user.doctorRecordId);
      const linkedSnap = await getDoc(linkedRef);
      if (linkedSnap.exists()) {
        const linkedEmail = String((linkedSnap.data() as Partial<Doctor>)['email'] ?? '')
          .toLowerCase()
          .trim();
        if (!linkedEmail || linkedEmail === normalized) {
          return;
        }
      }
    }
    const doctorsSnap = await getDocs(this.doctorsRef);
    const match = doctorsSnap.docs.find(
      (d) => ((d.data() as Partial<Doctor>)['email'] ?? '').toString().toLowerCase().trim() === normalized,
    );
    if (match) {
      await updateDoc(userRef, { doctorRecordId: match.id });
      return;
    }

    // Fallback: create a local doctor profile so doctor accounts always map to
    // a `doctors/{id}` record in the emulator.
    const nameSeed = normalized.split('@')[0] || 'doctor';
    const created = await addDoc(this.doctorsRef, {
      doctorName: `Dr. ${nameSeed.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
      specialization: 'General Practice',
      subSpecialization: 'General Consultation',
      branch: 'Main',
      hmo: 'Maxicare',
      email: normalized,
    });
    await updateDoc(userRef, { doctorRecordId: created.id });
  }

  async createUserProfile(uid: string, partial: { email: string; role: UserRole; fullName: string }): Promise<User> {
    return this.createUserProfileAtomic(uid, partial);
  }
/** A- One PeR User */
  async createUserProfileAtomic(
    uid: string,
    partial: { email: string; role: UserRole; fullName: string },
  ): Promise<User> {
    const normalizedEmail = this.normalizeEmail(partial.email);
    const userRef = doc(db, 'users', uid);
    const userEmailRef = doc(this.userEmailsRef, normalizedEmail);
    const user: User = {
      uid,
      email: normalizedEmail,
      role: partial.role,
      fullName: partial.fullName,
      phoneNumber: '',
      bloodType: '',
      symptoms: '',
      dateOfBirth: '',
    };

    await runTransaction(db, async (transaction) => {
      const [userSnapshot, userEmailSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(userEmailRef),
      ]);

      if (userSnapshot.exists()) {
        throw new Error('User profile already exists.');
      }
      if (userEmailSnapshot.exists()) {
        const ownerUid = String(userEmailSnapshot.data()['uid'] ?? '');
        if (ownerUid && ownerUid !== uid) {
          throw new Error('This email is already registered.');
        }
      }

      transaction.set(userRef, user);
      transaction.set(userEmailRef, {
        uid,
        role: partial.role,
        email: normalizedEmail,
        createdAt: new Date().toISOString(),
      });
    });

    return user;
  }

  async createLoginSessionAtomic(uid: string, selectedRole: UserRole): Promise<User> {
    const userRef = doc(db, 'users', uid);
    const sessionRef = doc(this.loginSessionsRef);
    const activityRef = doc(this.loginHistoryRef);
    const now = new Date().toISOString();

    let profile: User | null = null;
    await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists()) {
        throw new Error('Account profile is missing.');
      }

      profile = userSnapshot.data() as User;
      if (profile.role !== selectedRole) {
        throw new Error('Selected role does not match your account.');
      }

      transaction.set(sessionRef, {
        userId: uid,
        role: selectedRole,
        status: 'active',
        loginAt: now,
      });
      transaction.set(activityRef, {
        userId: uid,
        role: selectedRole,
        loggedInAt: now,
      });
      transaction.update(userRef, {
        lastLoginAt: now,
        activeSessionId: sessionRef.id,
      });
    });

    if (!profile) {
      throw new Error('Failed to create login session.');
    }
    return profile;
  }

  async closeActiveSessions(uid: string): Promise<void> {
    const q = query(this.loginSessionsRef, where('userId', '==', uid), where('status', '==', 'active'));
    const snapshots = await getDocs(q);
    const now = new Date().toISOString();
    await Promise.all(
      snapshots.docs.map((entry) =>
        updateDoc(doc(this.loginSessionsRef, entry.id), {
          status: 'ended',
          logoutAt: now,
        }),
      ),
    );
  }

  watchUsers(role: UserRole): Observable<User[]> {
    const q = query(this.usersRef, where('role', '==', role));
    return this.watchCollection<User>(q);
  }

  watchAppointments(): Observable<Appointment[]> {
    const q = query(this.appointmentsRef, orderBy('appointmentDate'), orderBy('appointmentTime'));
    return this.watchCollection<Appointment>(q);
  }

  watchAppointmentsByDoctor(doctorId: string): Observable<Appointment[]> {
    const q = query(
      this.appointmentsRef,
      where('doctorId', '==', doctorId),
      orderBy('appointmentDate'),
      orderBy('appointmentTime'),
    );
    return this.watchAppointmentsQueryStrict(q);
  }

  watchAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    const q = query(
      this.appointmentsRef,
      where('patientId', '==', patientId),
      orderBy('appointmentDate'),
      orderBy('appointmentTime'),
    );
    return this.watchCollection<Appointment>(q);
  }

  watchDoctors(): Observable<Doctor[]> {
    return this.watchCollection<Doctor>(query(this.doctorsRef, orderBy('doctorName')));
  }

  watchDoctorSlotsForDate(
    doctorId: string,
    appointmentDate: string,
  ): Observable<
    {
      doctorId: string;
      appointmentDate: string;
      appointmentTime: string;
      blockEndTime?: string;
      status?: string;
    }[]
  > {
    const q = query(
      this.appointmentSlotsRef,
      where('doctorId', '==', doctorId),
      where('appointmentDate', '==', appointmentDate),
    );
    return this.watchCollection(q);
  }

  async ensureDoctorsSeeded(): Promise<void> {
    const sampleDoctors: Omit<Doctor, 'id'>[] = [
      {
        doctorName: 'Dr. Maria Cruz',
        specialization: 'Cardiology',
        subSpecialization: 'Interventional',
        branch: 'Main',
        hmo: 'Maxicare',
        email: 'doctor1@clinic.test',
      },
      {
        doctorName: 'Dr. Alvin Reyes',
        specialization: 'Neurology',
        subSpecialization: 'Stroke',
        branch: 'North',
        hmo: 'Intellicare',
        email: 'doctor2@clinic.test',
      },
      {
        doctorName: 'Dr. Joy Santos',
        specialization: 'Pediatrics',
        subSpecialization: 'Pulmonology',
        branch: 'South',
        hmo: 'Medicard',
        email: 'doctor3@clinic.test',
      },
      {
        doctorName: 'Dr. IRIS AYN M. MAGPALI',
        specialization: 'Adult Pulmonary Medicine',
        subSpecialization: 'Sleep Medicine',
        branch: 'Main',
        hmo: 'Maxicare',
        email: 'doctor4@clinic.test',
      },
      {
        doctorName: 'Dr. GERONIMO-DE JESUS, OLIVIA',
        specialization: 'Allergology',
        subSpecialization: 'General Allergology',
        branch: 'Main',
        hmo: 'Intellicare',
        email: 'doctor5@clinic.test',
      },
      {
        doctorName: 'Dr. REBURIANO, RHIA ADRIENNE',
        specialization: 'Allergology',
        subSpecialization: 'Clinical Immunology',
        branch: 'North',
        hmo: 'Medicard',
        email: 'doctor6@clinic.test',
      },
      {
        doctorName: 'Dr. EPINO, KATRINA ISABEL M.',
        specialization: 'Anesthesiology',
        subSpecialization: 'Perioperative Medicine',
        branch: 'South',
        hmo: 'Maxicare',
        email: 'doctor7@clinic.test',
      },
    ];
    const existingDoctors = await getDocs(this.doctorsRef);
    const existingEmails = new Set(
      existingDoctors.docs
        .map((entry) => ((entry.data() as Partial<Doctor>)['email'] ?? '').toLowerCase())
        .filter((email): email is string => !!email),
    );
    for (const doctor of sampleDoctors) {
      if (!existingEmails.has(doctor.email.toLowerCase())) {
        await addDoc(this.doctorsRef, doctor);
      }
    }
  }
  async createAppointmentAtomic(payload: {
    patientId: string;
    doctorId: string;
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    symptoms?: string;
  }): Promise<void> {
    this.assertDoctorSchedule(payload.appointmentTime);
    const appointmentRef = doc(this.appointmentsRef);
    const appointmentId = appointmentRef.id;
    const slotId = `${payload.doctorId}_${payload.appointmentDate}_${payload.appointmentTime}`;
    const patientSlotId = `${payload.patientId}_${payload.appointmentDate}_${payload.appointmentTime}`;
    const slotRef = doc(this.appointmentSlotsRef, slotId);
    const patientSlotRef = doc(this.patientAppointmentSlotsRef, patientSlotId);
    const doctorNotificationRef = doc(this.doctorNotificationsRef, `${payload.doctorId}_${appointmentId}`);
    const patientHistoryRef = doc(this.patientAppointmentHistoryRef, `${payload.patientId}_${appointmentId}`);
    const doctorRef = doc(this.doctorsRef, payload.doctorId);
    const endTime = blockEndTime(payload.appointmentTime);
    const doctorDaySlotsQuery = query(
      this.appointmentSlotsRef,
      where('doctorId', '==', payload.doctorId),
      where('appointmentDate', '==', payload.appointmentDate),
    );
    const daySlotsPreview = await getDocs(doctorDaySlotsQuery);
    for (const existing of daySlotsPreview.docs) {
      const data = existing.data() as { appointmentTime?: string; status?: string };
      const existingTime = String(data.appointmentTime ?? '');
      if (
        existingTime &&
        slotBlocksActiveAppointment(data.status) &&
        blocksOverlap(existingTime, payload.appointmentTime)
      ) {
        throw new Error(
          `Doctor is unavailable from ${existingTime} to ${blockEndTime(existingTime)}. Choose another time.`,
        );
      }
    }

    await runTransaction(db, async (transaction) => {
      const [slotSnapshot, patientSlotSnapshot, doctorSnapshot] = await Promise.all([
        transaction.get(slotRef),
        transaction.get(patientSlotRef),
        transaction.get(doctorRef),
      ]);

      if (!doctorSnapshot.exists()) {
        throw new Error('Selected doctor is no longer available.');
      }
      if (slotSnapshot.exists()) {
        throw new Error('Slot unavailable');
      }
      if (patientSlotSnapshot.exists()) {
        throw new Error('You already have an appointment at this schedule.');
      }

      const existingSnaps = await Promise.all(
        daySlotsPreview.docs.map((existing) =>
          transaction.get(doc(this.appointmentSlotsRef, existing.id)),
        ),
      );
      for (const existingSnap of existingSnaps) {
        if (!existingSnap.exists()) {
          continue;
        }
        const data = existingSnap.data() as { appointmentTime?: string; status?: string };
        const existingTime = String(data.appointmentTime ?? '');
        if (
          existingTime &&
          slotBlocksActiveAppointment(data.status) &&
          blocksOverlap(existingTime, payload.appointmentTime)
        ) {
          throw new Error(
            `Doctor is unavailable from ${existingTime} to ${blockEndTime(existingTime)}. Choose another time.`,
          );
        }
      }

      const now = new Date().toISOString();
      const appointment = {
        ...payload,
        symptoms: (payload.symptoms ?? '').trim(),
        status: 'pending' as Appointment['status'],
        feedback: '',
        createdAt: now,
      };

      transaction.set(appointmentRef, appointment);
      transaction.set(slotRef, {
        appointmentId,
        doctorId: payload.doctorId,
        patientId: payload.patientId,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        blockEndTime: endTime,
        status: 'pending',
        createdAt: now,
      });
      transaction.set(doctorNotificationRef, {
        appointmentId,
        doctorId: payload.doctorId,
        patientId: payload.patientId,
        patientName: payload.patientName,
        doctorName: payload.doctorName,
        symptoms: appointment.symptoms,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        blockEndTime: endTime,
        status: 'pending',
        createdAt: now,
      });
      transaction.set(patientHistoryRef, {
        appointmentId,
        patientId: payload.patientId,
        doctorId: payload.doctorId,
        doctorName: payload.doctorName,
        symptoms: appointment.symptoms,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        status: 'pending',
        createdAt: now,
      });
      transaction.set(patientSlotRef, {
        appointmentId,
        patientId: payload.patientId,
        doctorId: payload.doctorId,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        createdAt: now,
      });
    });
  }

  async patchAppointmentAtomic(
    appointmentId: string,
    patch: {
      status: Appointment['status'];
      rejectedBy?: Appointment['rejectedBy'];
      adminRejectionReason?: string;
    },
    options?: { expectCurrentIn?: Appointment['status'][]; actedBy?: 'admin' | 'doctor' | 'patient' },
  ): Promise<void> {
    const appointmentRef = doc(this.appointmentsRef, appointmentId);
    await runTransaction(db, async (transaction) => {
      const appointmentSnapshot = await transaction.get(appointmentRef);
      if (!appointmentSnapshot.exists()) {
        throw new Error('Appointment not found.');
      }

      const appointment = appointmentSnapshot.data() as Appointment;
      const currentStatus = displayAppointmentStatus(String(appointment.status));
      if (options?.expectCurrentIn?.length && !options.expectCurrentIn.includes(currentStatus)) {
        throw new Error('This appointment is no longer in a state that allows this action.');
      }

      const now = new Date().toISOString();
      const updates: Record<string, unknown> = {
        status: patch.status,
        updatedAt: now,
      };
      if (patch.status === 'waiting_admin_approval') {
        updates['submittedToAdminAt'] = now;
      }
      if (patch.status === 'doctor_rejected' || patch.status === 'cancelled') {
        updates['rejectedBy'] = patch.rejectedBy ?? 'doctor';
      } else if (patch.status === 'admin_rejected') {
        updates['rejectedBy'] = patch.rejectedBy ?? 'admin';
        updates['adminRejectionReason'] = patch.adminRejectionReason ?? '';
        updates['feedback'] = patch.adminRejectionReason ?? '';
      } else if (appointment.rejectedBy) {
        updates['rejectedBy'] = deleteField();
      }
      if (patch.status !== 'admin_rejected' && patch.adminRejectionReason === undefined && appointment.adminRejectionReason) {
        updates['adminRejectionReason'] = deleteField();
      }

      transaction.update(appointmentRef, updates);

      const doctorNotificationRef = doc(this.doctorNotificationsRef, `${appointment.doctorId}_${appointmentId}`);
      const patientHistoryRef = doc(this.patientAppointmentHistoryRef, `${appointment.patientId}_${appointmentId}`);
      const relatedPatch: Record<string, unknown> = { status: patch.status, updatedAt: now };
      if (patch.status === 'admin_rejected' && patch.adminRejectionReason) {
        relatedPatch['adminRejectionReason'] = patch.adminRejectionReason;
        relatedPatch['feedback'] = patch.adminRejectionReason;
      }
      transaction.set(doctorNotificationRef, relatedPatch, { merge: true });
      transaction.set(patientHistoryRef, relatedPatch, { merge: true });

      const scheduleRef = doc(
        this.doctorSchedulesRef,
        `${appointment.doctorId}_${appointment.appointmentDate}_${appointment.appointmentTime}`,
      );
      const medicalRecordRef = doc(this.medicalRecordsRef, appointmentId);
      const slotRef = doc(
        this.appointmentSlotsRef,
        `${appointment.doctorId}_${appointment.appointmentDate}_${appointment.appointmentTime}`,
      );
      if (appointmentBlocksSchedule(patch.status)) {
        transaction.set(
          slotRef,
          {
            status: patch.status,
            blockEndTime: blockEndTime(appointment.appointmentTime),
            updatedAt: now,
          },
          { merge: true },
        );
      }

      if (patch.status === 'admin_approved' && options?.actedBy === 'admin') {
        transaction.set(
          scheduleRef,
          {
            appointmentId,
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            doctorName: appointment.doctorName,
            patientName: appointment.patientName,
            appointmentDate: appointment.appointmentDate,
            appointmentTime: appointment.appointmentTime,
            status: 'admin_approved',
            approvedAt: now,
          },
          { merge: true },
        );
        transaction.set(
          medicalRecordRef,
          {
            appointmentId,
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            doctorName: appointment.doctorName,
            patientName: appointment.patientName,
            diagnosis: '',
            prescriptions: [],
            notes: '',
            createdAt: now,
            updatedAt: now,
          },
          { merge: true },
        );
      }

      const releaseSlots =
        patch.status === 'doctor_rejected' ||
        patch.status === 'admin_rejected' ||
        patch.status === 'cancelled';
      if (releaseSlots) {
        const slotId = `${appointment.doctorId}_${appointment.appointmentDate}_${appointment.appointmentTime}`;
        const patientSlotId = `${appointment.patientId}_${appointment.appointmentDate}_${appointment.appointmentTime}`;
        transaction.delete(doc(this.appointmentSlotsRef, slotId));
        transaction.delete(doc(this.patientAppointmentSlotsRef, patientSlotId));
        transaction.delete(scheduleRef);
      }
    });
  }

  async updateAppointmentFeedback(appointmentId: string, feedback: string): Promise<void> {
    await updateDoc(doc(this.appointmentsRef, appointmentId), {
      feedback: feedback.trim(),
      feedbackAt: new Date().toISOString(),
    });
  }

  async updateLoginHistory(userId: string): Promise<void> {
    await addDoc(this.loginHistoryRef, {
      userId,
      loggedInAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', userId), { lastLoginAt: new Date().toISOString() });
  }

  async watchLoginHistoryCount(): Promise<number> {
    const snapshots = await getDocs(this.loginHistoryRef);
    return snapshots.size;
  }

  watchLoginHistoryCountLive(): Observable<number> {
    return new Observable<number>((subscriber) => {
      const unsubscribe = onSnapshot(
        this.loginHistoryRef,
        (snapshot) => subscriber.next(snapshot.size),
        (error) => subscriber.error(error),
      );
      return () => unsubscribe();
    });
  }

  async updateUser(uid: string, partial: Partial<User>): Promise<void> {
    await updateDoc(doc(db, 'users', uid), partial as Record<string, unknown>);
  }

  async deleteUser(uid: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid));
  }

  private watchCollection<T>(q: ReturnType<typeof query>): Observable<T[]> {
    return new Observable<T[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as object) } as T)),
          );
        },
        (error) => {
          console.error('Firestore listener error:', error);
          subscriber.next([]);
        },
      );
      return () => unsubscribe();
    });
  }

  /** Emits `subscriber.error` on listener failure (e.g. missing composite index). */
  private watchAppointmentsQueryStrict(q: ReturnType<typeof query>): Observable<Appointment[]> {
    return new Observable<Appointment[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          subscriber.next(
            snapshot.docs.map(
              (item) => ({ id: item.id, ...(item.data() as object) } as Appointment),
            ),
          );
        },
        (error) => {
          console.error('Firestore appointments listener error:', error);
          subscriber.error(error);
        },
      );
      return () => unsubscribe();
    });
  }

  /** C-Outside of the time for doctors */
  private assertDoctorSchedule(appointmentTime: string): void {
    const [hourString] = appointmentTime.split(':');
    const hour = Number(hourString);
    if (Number.isNaN(hour) || hour < 8 || hour > 17) {
      throw new Error('Appointment is outside doctor schedule (8:00 AM - 5:00 PM).');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
