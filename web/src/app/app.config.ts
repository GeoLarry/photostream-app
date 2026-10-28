import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { IMAGE_LOADER } from '@angular/common';
import { picsumLoader } from './shared/images/picsum-loader';
import { authInterceptor } from './shared/http/auth.interceptor';
import { AuthService } from './shared/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: IMAGE_LOADER, useValue: picsumLoader },
    // Restore a stored session before the first route runs, so guards and the header know who is signed in
    provideAppInitializer(() => inject(AuthService).restoreSession())
  ]
};
