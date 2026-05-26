import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Loading } from './shared/loading/loading';
import { Toast } from './shared/toast/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Toast, Loading],
  template: `
    <app-toast></app-toast>
    <app-loading></app-loading>
    <router-outlet></router-outlet>
  `,
})
export class App {}