import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastState } from '../toast-state';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  readonly toast$;

  constructor(private readonly toastService: ToastState) {
    this.toast$ = this.toastService.watch();
  }
}
