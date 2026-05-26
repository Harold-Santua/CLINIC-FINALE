import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  @Input()
  links: { label: string; url: string }[] = [];

  constructor(
    private readonly authService: Auth,
    private readonly router: Router,
  ) {}

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
