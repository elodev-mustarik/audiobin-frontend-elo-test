import {Injectable} from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import decode from 'jwt-decode';
import {EAuthenticatedRoutes, EPublicRoutes} from '../../enums/routes.enum';

@Injectable()
export class AuthGuardService  {
  constructor(public router: Router) {}

  validRoute(route: string | undefined): boolean {
    if (route === undefined) {
      return false;
    }

    return [...Object.values(EAuthenticatedRoutes), ...Object.values(EPublicRoutes)].includes(
      route as EAuthenticatedRoutes | EPublicRoutes
    );
  }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const token = localStorage.getItem('token');
    if (token !== null) {
      try {
        const payload: Record<string, unknown> = decode(token);
        if (Number.isInteger(payload.iat) && Number.isInteger(payload.exp)) {
          const currentTimeInSec = Math.floor(new Date().getTime() / 1000);
          if (
            currentTimeInSec >= (payload.iat as number) &&
            currentTimeInSec <= (payload.exp as number)
          )
            if (!this.validRoute(route.routeConfig?.path))
              this.router.navigate([EAuthenticatedRoutes.MAIN]);
          return true;
        }
      } catch (err) {
        // Checking for invalid tokens
        console.error(err);
        this.router.navigate(['']);
      }
    }
    this.router.navigate(['']);
    return false;
  }
}
