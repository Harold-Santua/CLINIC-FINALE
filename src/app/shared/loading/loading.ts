import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingState } from '../loading-state';

@Component({
  selector: 'app-loading',
  imports: [CommonModule],
  templateUrl: './loading.html',
  styleUrl: './loading.css',
})
export class Loading {
  readonly loading$;

  constructor(private readonly loadingService: LoadingState) {
    this.loading$ = this.loadingService.watch();
  }
}
