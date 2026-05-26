import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingState {
  private readonly loading$ = new BehaviorSubject<boolean>(false);

  watch() {
    return this.loading$.asObservable();
  }

  setLoading(isLoading: boolean): void {
    this.loading$.next(isLoading);
  }
}
