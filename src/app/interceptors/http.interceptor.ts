import {Injectable} from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {environment} from '../../environments/environment';
import {AuthService} from '../services/auth/auth.service';
import {catchError} from 'rxjs/operators';
import {LogoutComponent} from '../components/logout/logout.component';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private logoutComponent: LogoutComponent) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // add auth header with jwt if account is logged in and request is to the api url
    const token = this.authService.getLoggedInToken();

    const isApiUrl = request.url.startsWith(environment.apiURL);

    if (token && isApiUrl) {
      request = request.clone({
        setHeaders: {Authorization: `Bearer ${token}`},
      });
    }

    return next.handle(request).pipe(
      // Handling JWT Token Expiration
      catchError((error: HttpErrorResponse) => {
        const JWT_ERROR_NAMES = ['TokenExpiredError', 'JsonWebTokenError', 'TokenLoggedOut'];
        if (error.status === 401 && JWT_ERROR_NAMES.includes(error.error?.name)) {
          this.logoutComponent.logout(false);
        }

        return throwError(error);
      })
    );
  }
}
