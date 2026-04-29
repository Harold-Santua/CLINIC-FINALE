import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navdoctor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navdoctor.html'
})
export class NavdoctorComponent {

  selectedTime = '';

  availability:any = {
    '8AM': ['doc1','doc3'],
    '9AM': ['doc2','doc4'],
    '10AM': ['doc1','doc2'],
    '11AM': ['doc3'],
    '1PM': ['doc4'],
    '2PM': ['doc1','doc4'],
    '3PM': ['doc2'],
    '4PM': ['doc3','doc4']
  };

  selectTime(time:string){
    this.selectedTime = time;
  }

  isAvailable(id:string){
    return this.availability[this.selectedTime]?.includes(id);
  }

  appoint(name:string){
    alert(name + ' booked at ' + this.selectedTime);
  }
}