import { Injectable } from '@angular/core';
import {
  RECAPTCHA_TOKEN_COOKIE_KEY,
} from '../constants/recaptcha.constants';
import { deleteAuthCookie, getAuthCookie, setAuthCookie } from '../utils/auth-cookie.util';

@Injectable({ providedIn: 'root' })
export class RecaptchaTokenService {
  setToken(token: string | null): void {
    if (token) {
      setAuthCookie(RECAPTCHA_TOKEN_COOKIE_KEY, token);
    } else {
      deleteAuthCookie(RECAPTCHA_TOKEN_COOKIE_KEY);
    }
  }

  getToken(): string | null {
    return getAuthCookie(RECAPTCHA_TOKEN_COOKIE_KEY);
  }

  clearToken(): void {
    deleteAuthCookie(RECAPTCHA_TOKEN_COOKIE_KEY);
  }
}