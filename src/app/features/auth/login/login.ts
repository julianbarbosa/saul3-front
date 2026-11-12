import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Footer } from '../../../core/footer/footer';
import { Header } from '../../../core/header/header';
import { AuthService } from '../../../core/services/auth.service';
import { Button } from '../../../shared/components/button/button';

@Component({
  selector: 'app-login',
  imports: [Header, Footer, Button, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);

  cargando = false;
  error = '';

  loginForm = this.formBuilder.group({
    usuario: ['', [Validators.required]],
    contrasena: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigate(['/main']);
    }
  }

  campoInvalido(campo: 'usuario' | 'contrasena'): boolean {
    const control = this.loginForm.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  iniciarSesion(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { usuario, contrasena } = this.loginForm.getRawValue();
    this.cargando = true;
    this.error = '';

    this.auth.login(usuario!, contrasena!).subscribe({
      next: (result) => {
        this.cargando = false;
        if (result.success) {
          void this.router.navigate(['/main']);
        } else {
          this.error = result.message ?? 'Usuario o contraseña incorrectos.';
        }
      },
      error: () => {
        this.cargando = false;
        this.error = 'No fue posible iniciar sesión. Intente nuevamente.';
      },
    });
  }
}
