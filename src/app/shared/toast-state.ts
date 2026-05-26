import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root',
})
export class ToastState {
  private readonly toast$ = new BehaviorSubject<ToastMessage | null>(null);

  watch() {
    return this.toast$.asObservable();
  }

  show(text: string, type: ToastMessage['type'] = 'info'): void {
    this.toast$.next({ text, type });
    setTimeout(() => this.toast$.next(null), 3000);
  }
}
