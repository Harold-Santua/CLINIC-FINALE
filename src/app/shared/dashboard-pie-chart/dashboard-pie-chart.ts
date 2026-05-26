import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PieChartSegment } from '../../services/doctor-dashboard-stats';

@Component({
  selector: 'app-dashboard-pie-chart',
  imports: [CommonModule],
  templateUrl: './dashboard-pie-chart.html',
  styleUrl: './dashboard-pie-chart.css',
})
export class DashboardPieChart implements OnChanges {
  @Input({ required: true }) segments: PieChartSegment[] = [];
  @Input() title = 'Appointment distribution';

  gradient = 'conic-gradient(#cbd5e1 0deg 360deg)';

  ngOnChanges(): void {
    this.gradient = this.buildGradient(this.segments);
  }

  private buildGradient(segments: PieChartSegment[]): string {
    if (!segments.length) {
      return 'conic-gradient(#cbd5e1 0deg 360deg)';
    }
    let cursor = 0;
    const stops: string[] = [];
    const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
    for (const segment of segments) {
      const degrees = (segment.value / total) * 360;
      const end = cursor + degrees;
      stops.push(`${segment.color} ${cursor}deg ${end}deg`);
      cursor = end;
    }
    return `conic-gradient(${stops.join(', ')})`;
  }
}
