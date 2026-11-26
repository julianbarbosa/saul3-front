import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

type GrecaptchaEnterprise = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: GrecaptchaEnterprise;
  }
}

@Injectable({ providedIn: 'root' })
export class RecaptchaV3Service {
  private scriptLoaded: Promise<void> | null = null;

  execute(action?: string): Promise<string> {
    const siteKey = environment.RECAPTCHA_SITE_KEY?.trim();
    if (!siteKey) {
      return Promise.reject(new Error('RECAPTCHA_SITE_KEY no configurada'));
    }

    const accion = (action ?? environment.RECAPTCHA_ACTION ?? 'api_access').trim();

    return this.ensureScript(siteKey).then(
      () =>
        new Promise<string>((resolve, reject) => {
          const grecaptcha = window.grecaptcha;
          if (!grecaptcha) {
            reject(new Error('grecaptcha no disponible'));
            return;
          }
          grecaptcha.ready(() => {
            grecaptcha.execute(siteKey, { action: accion }).then(resolve).catch(reject);
          });
        }),
    );
  }

  private ensureScript(siteKey: string): Promise<void> {
    if (window.grecaptcha) {
      return Promise.resolve();
    }

    if (!this.scriptLoaded) {
      this.scriptLoaded = new Promise<void>((resolve, reject) => {
        const id = 'google-recaptcha-v3';
        if (document.getElementById(id)) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.id = id;
        script.async = true;
        script.defer = true;
        script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar el script de reCAPTCHA'));
        document.head.appendChild(script);
      });
    }

    return this.scriptLoaded;
  }
}