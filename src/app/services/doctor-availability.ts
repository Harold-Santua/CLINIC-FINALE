import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, of } from 'rxjs';
import { Appointment, appointmentBlocksSchedule, displayAppointmentStatus } from '../interfaces/appointment';
import { Doctor } from '../interfaces/doctor';
import { blocksOverlap, blockEndTime, parseTimeToMinutes } from './appointment-schedule.util';
import { Firestore } from './firestore';

export interface DoctorAvailabilityRow {
  doctor: Doctor;
  busy: boolean;
  label: string;
  blockedTimes: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DoctorAvailability {
  constructor(private readonly firestore: Firestore) {}

  parseMinutes(time: string): number {
    return parseTimeToMinutes(time);
  }

  blockEnd(time: string): string {
    return blockEndTime(time);
  }

  /** True when the requested start overlaps an existing active block. */
  isSlotBlocked(
    existingSlots: { appointmentTime?: string; status?: string }[],
    requestedTime: string,
  ): boolean {
    return existingSlots.some((slot) => {
      const start = String(slot.appointmentTime ?? '');
      if (!start) {
        return false;
      }
      const status = slot.status ?? 'pending';
      if (!appointmentBlocksSchedule(String(status))) {
        return false;
      }
      return blocksOverlap(start, requestedTime);
    });
  }

  /** Doctor is in an active 1-hour block right now (for admin filter). */
  isInActiveBlockNow(appointment: Appointment, now = new Date()): boolean {
    if (!appointmentBlocksSchedule(String(appointment.status))) {
      return false;
    }
    const today = this.isoDate(now);
    if (appointment.appointmentDate !== today) {
      return false;
    }
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = parseTimeToMinutes(appointment.appointmentTime);
    return nowMinutes >= start && nowMinutes < start + 60;
  }

  watchAvailabilityForDate(
    doctors: Doctor[],
    appointmentDate: string,
  ): Observable<DoctorAvailabilityRow[]> {
    if (!doctors.length || !appointmentDate) {
      return of([]);
    }
    return combineLatest(
      doctors.map((doctor) =>
        this.firestore.watchDoctorSlotsForDate(doctor.id, appointmentDate).pipe(
          map((slots) => this.toRow(doctor, slots)),
        ),
      ),
    );
  }

  private toRow(
    doctor: Doctor,
    slots: { appointmentTime?: string; status?: string }[],
  ): DoctorAvailabilityRow {
    const blocked = slots
      .filter((s) => appointmentBlocksSchedule(String(s.status ?? 'pending')))
      .map((s) => String(s.appointmentTime ?? ''))
      .filter(Boolean);
    const busy = blocked.length > 0;
    const label = busy
      ? `Unavailable (${blocked.map((t) => `${t}–${blockEndTime(t)}`).join(', ')})`
      : 'Available';
    return { doctor, busy, label, blockedTimes: blocked };
  }

  private isoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  filterAppointmentsByAvailability(
    items: Appointment[],
    mode: 'all' | 'available' | 'unavailable' | 'in_active_block',
    doctors: Doctor[],
    filterDate: string,
  ): Appointment[] {
    if (mode === 'all') {
      return items;
    }
    const doctorIdsWithBlock = new Set<string>();
    const doctorIdsActiveNow = new Set<string>();
    const date = filterDate || this.isoDate(new Date());

    for (const item of items) {
      if (item.appointmentDate !== date) {
        continue;
      }
      if (appointmentBlocksSchedule(String(item.status))) {
        doctorIdsWithBlock.add(item.doctorId);
      }
      if (this.isInActiveBlockNow(item)) {
        doctorIdsActiveNow.add(item.doctorId);
      }
    }

    if (mode === 'in_active_block') {
      return items.filter((item) => doctorIdsActiveNow.has(item.doctorId));
    }
    if (mode === 'unavailable') {
      return items.filter((item) => doctorIdsWithBlock.has(item.doctorId));
    }
    const availableDoctorIds = new Set(doctors.map((d) => d.id).filter((id) => !doctorIdsWithBlock.has(id)));
    return items.filter((item) => availableDoctorIds.has(item.doctorId));
  }
}
