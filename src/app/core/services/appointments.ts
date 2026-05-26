import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase';

export type AppointmentStatus = 'pending' | 'approved' | 'completed' | 'rejected';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  doctorNotes: string;
  createdAt?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class Appointments {
  private appointmentsRef = collection(db, 'appointments');

  async create(payload: Omit<Appointment, 'id' | 'status' | 'doctorNotes' | 'createdAt'>): Promise<void> {
    await addDoc(this.appointmentsRef, {
      ...payload,
      status: 'pending' as AppointmentStatus,
      doctorNotes: '',
      createdAt: serverTimestamp(),
    });
  }

  watchAll(): Observable<Appointment[]> {
    return this.watchFromQuery(query(this.appointmentsRef, orderBy('date'), orderBy('time')));
  }

  watchByDoctor(doctorId: string): Observable<Appointment[]> {
    const q = query(this.appointmentsRef, where('doctorId', '==', doctorId), orderBy('date'), orderBy('time'));
    return this.watchFromQuery(q);
  }

  watchByPatient(patientId: string): Observable<Appointment[]> {
    const q = query(this.appointmentsRef, where('patientId', '==', patientId), orderBy('date'), orderBy('time'));
    return this.watchFromQuery(q);
  }

  async setStatus(appointmentId: string, status: AppointmentStatus): Promise<void> {
    await updateDoc(doc(db, 'appointments', appointmentId), { status });
  }

  async addDoctorNote(appointmentId: string, notes: string): Promise<void> {
    await updateDoc(doc(db, 'appointments', appointmentId), {
      doctorNotes: notes.trim(),
      status: 'completed',
    });
  }

  private watchFromQuery(q: ReturnType<typeof query>): Observable<Appointment[]> {
    return new Observable<Appointment[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const entries = snapshot.docs.map((entry) => {
            const data = entry.data() as Omit<Appointment, 'id'>;
            return {
              id: entry.id,
              ...data,
            };
          });
          subscriber.next(entries);
        },
        (error) => subscriber.error(error),
      );

      return () => unsubscribe();
    });
  }
}
