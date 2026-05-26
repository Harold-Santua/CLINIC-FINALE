import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Appointment } from '../interfaces/appointment';
import { Auth } from './auth';
import { Firestore } from './firestore';

export interface DoctorAppointmentsState {
  appointments: Appointment[];
  /** Firestore query failure, missing index, or account not linked to a directory doctor. */
  streamError: string | null;
}

const UNLINKED_DOCTOR_MSG =
  'Your doctor account is not linked to a directory profile. Ask an admin to open Admin → Link doctor records and set your catalog doctor, or sign in with the same email as your listing in the doctors directory.';

function formatFirestoreError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message: string }).message);
    const code = 'code' in err ? String((err as { code: string }).code) : '';
    if (
      message.toLowerCase().includes('index') ||
      code === 'failed-precondition' ||
      message.includes('requires an index')
    ) {
      return 'Firestore needs a composite index for doctor appointments. Deploy firestore.indexes.json (see project root) or use the “Create index” link from the browser console error, then reload.';
    }
    return code ? `${code}: ${message}` : message;
  }
  return err instanceof Error ? err.message : 'Could not load appointments.';
}

/**
 * Resolves the Firestore `doctors` document id for the signed-in doctor user.
 * Appointment records use `doctors/{id}` ids, not Firebase Auth UIDs.
 */
@Injectable({
  providedIn: 'root',
})
export class DoctorAppointments {
  constructor(
    private readonly firestore: Firestore,
    private readonly auth: Auth,
  ) {}

  /**
   * Live stream of this doctor’s appointments plus configuration/query errors
   * (so the UI is not silent when the query fails or the account is unlinked).
   */
  watchMyAppointments(): Observable<DoctorAppointmentsState> {
    return this.auth.watchProfile().pipe(
      switchMap((profile) => {
        if (!profile || profile.role !== 'doctor') {
          return of<DoctorAppointmentsState>({ appointments: [], streamError: null });
        }
        if (profile.doctorRecordId) {
          return this.streamForDoctorId(profile.doctorRecordId);
        }
        const email = profile.email?.toLowerCase().trim() ?? '';
        return this.firestore.watchDoctors().pipe(
          switchMap((doctors) => {
            const match = doctors.find((d) => d.email.toLowerCase().trim() === email);
            if (!match?.id) {
              return of<DoctorAppointmentsState>({
                appointments: [],
                streamError: UNLINKED_DOCTOR_MSG,
              });
            }
            void this.firestore.persistDoctorRecordId(profile.uid, match.id);
            return this.streamForDoctorId(match.id);
          }),
          catchError((err) =>
            of<DoctorAppointmentsState>({
              appointments: [],
              streamError: formatFirestoreError(err),
            }),
          ),
        );
      }),
    );
  }

  private streamForDoctorId(doctorId: string): Observable<DoctorAppointmentsState> {
    return this.firestore.watchAppointmentsByDoctor(doctorId).pipe(
      map((items) => ({
        appointments: this.dedupeById(items),
        streamError: null as string | null,
      })),
      catchError((err) =>
        of<DoctorAppointmentsState>({
          appointments: [],
          streamError: formatFirestoreError(err),
        }),
      ),
    );
  }

  private dedupeById(items: Appointment[]): Appointment[] {
    const seen = new Set<string>();
    return items.filter((a) => {
      if (!a.id || seen.has(a.id)) {
        return false;
      }
      seen.add(a.id);
      return true;
    });
  }
}
