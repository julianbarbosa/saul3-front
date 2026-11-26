import { ApplicationConfig, importProvidersFrom, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { httpLoadingInterceptor } from './core/interceptors/http-loading.interceptor';
import { permisosRefreshInterceptor } from './core/interceptors/permisos-refresh.interceptor';
import { publicRecaptchaInterceptor } from './core/interceptors/public-recaptcha.interceptor';
import { initPermisosAlArranque } from './core/initializers/permisos.initializer';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { SharedModule } from './shared/shared-module';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(initPermisosAlArranque),
    provideHttpClient(
      withInterceptors([
        authTokenInterceptor,
        publicRecaptchaInterceptor,
        permisosRefreshInterceptor,
        httpLoadingInterceptor,
      ]),
    ),
    provideRouter(routes),
    importProvidersFrom(SharedModule),
  ],
};
