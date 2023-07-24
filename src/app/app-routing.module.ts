import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {HomeComponent} from './pages/home/home.component';
import {MainComponent} from './pages/main/main.component';
import {PlayerComponent} from './components/player/player.component';

import {EAuthenticatedRoutes, EPublicRoutes} from './enums/routes.enum';

// Role-guard for frontend
import {AuthGuardService as AuthGuard} from './services/auth/auth-guard.service';

const routes: Routes = [
  {path: EPublicRoutes.LOGIN, component: HomeComponent},
  {path: EPublicRoutes.LOGIN_VERIFY, component: HomeComponent},
  {path: EPublicRoutes.HOME, component: HomeComponent},
  {path: EPublicRoutes.PLAYLIST, component: PlayerComponent},
  {path: EAuthenticatedRoutes.MAIN, component: MainComponent, canActivate: [AuthGuard]},
  {path: '**', component: MainComponent, canActivate: [AuthGuard]},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
