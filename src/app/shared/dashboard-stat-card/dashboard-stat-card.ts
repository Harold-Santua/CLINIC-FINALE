import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-stat-card',
  imports: [CommonModule],
  templateUrl: './dashboard-stat-card.html',
  styleUrl: './dashboard-stat-card.css',
})
export class DashboardStatCard {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: number | string;
  @Input() hint = '';
  @Input() icon = '◆';
  @Input() accent: 'teal' | 'blue' | 'violet' | 'amber' | 'rose' = 'teal';
}
