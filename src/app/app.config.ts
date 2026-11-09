import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpLoadingInterceptor } from './core/interceptors/http-loading.interceptor';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { SharedModule } from './shared/shared-module';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([httpLoadingInterceptor])),
    provideRouter(routes),
    importProvidersFrom(SharedModule),
  ],
};
