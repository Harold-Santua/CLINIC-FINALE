import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { User } from '../../interfaces/user';
import { Firestore } from '../../services/firestore';
import { Sidebar } from '../../shared/sidebar/sidebar';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  doctors: User[] = [];
  patients: User[] = [];
  draftNames: Record<string, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(private readonly firestoreService: Firestore) {
    this.subscriptions.push(
      this.firestoreService.watchUsers('doctor').subscribe((doctors) => (this.doctors = doctors)),
      this.firestoreService.watchUsers('patient').subscribe((patients) => (this.patients = patients)),
    );
  }

  async save(user: User): Promise<void> {
    await this.firestoreService.updateUser(user.uid, {
      fullName: this.draftNames[user.uid] || user.fullName,
    });
  }

  async remove(uid: string): Promise<void> {
    await this.firestoreService.deleteUser(uid);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((item) => item.unsubscribe());
  }
}
