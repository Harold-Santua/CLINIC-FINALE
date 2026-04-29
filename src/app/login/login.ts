import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule,NgIf],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {

  role: string = '';
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private router: Router) {}

  setRole(r: string) {
    this.role = r;
  }

  login() {

    // VALIDATION
    if (!this.role || !this.email || !this.password) {
      this.errorMessage = "⚠ Please fill all fields and select a role.";
      return;
    }

    this.errorMessage = '';

    // REDIRECT BASED ON ROLE
    this.router.navigate(['/' + this.role]);
    
  }
}