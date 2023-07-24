import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {CommonModule} from '@angular/common';
import {AppRoutingModule} from './app-routing.module';
import {MaterialExampleModule} from './material.module';
import {MatDialogModule} from '@angular/material/dialog';
import {CdkAccordionModule} from '@angular/cdk/accordion';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {RouterModule} from '@angular/router';
import {AppComponent} from './app.component';
import {HomeComponent} from '../app/pages/home/home.component';
import {MainComponent} from '../app/pages/main/main.component';
import {HttpClientModule, HTTP_INTERCEPTORS} from '@angular/common/http';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AuthService} from './services/auth/auth.service';
import {AuthGuardService} from './services/auth/auth-guard.service';
import {LogoutComponent} from './components/logout/logout.component';
import {ConfirmDialogComponent} from './components/yes-no/yes-no.dialog';
import {NewProjectDialog} from './components/new-project/new-project.component';
import {ProjectSettingsDialog} from './components/project-settings/project-settings.component';
import {SkyDialog} from './components/login-skytracks/login-skytracks.component';
import {ProjectsService} from './services/project/projects.service';
import {UsersService} from './services/users/users.service';
import {PermissionsService} from './services/permissions/permissions.service';
import {Mp3ParserService} from './services/mp3Parser/mp3Parser.service';
import {MediaPlayerService} from './services/mediaPlayer/mediaPlayer.service';
import {AuthInterceptor} from './interceptors/http.interceptor';
import {EditableUsernameModalComponent} from './components/editable-username-modal/editable-username-modal.component';
import {LoginCardHeaderComponent} from './components/login-card-header/login-card-header.component';
import {ActivitylogCardComponent} from './components/activitylog-card/activitylog-card.component';
import {NotemodalComponent} from './components/notemodal/notemodal.component';
import {NgxTurnstileModule} from 'ngx-turnstile';
import {PlayerComponent} from './components/player/player.component';
import {FileEditModalComponent} from './components/file-edit-modal/file-edit-modal.component';
import { FileRenameComponent } from './components/file-rename/file-rename.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    MainComponent,
    LogoutComponent,
    NewProjectDialog,
    ProjectSettingsDialog,
    SkyDialog,
    ConfirmDialogComponent,
    EditableUsernameModalComponent,
    LoginCardHeaderComponent,
    ActivitylogCardComponent,
    NotemodalComponent,
    PlayerComponent,
    FileEditModalComponent,
    FileRenameComponent,
  ],
  imports: [
    RouterModule,
    CommonModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MaterialExampleModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgxTurnstileModule,
    MatDialogModule,
    CdkAccordionModule,
  ],
  providers: [
    AuthService,
    AuthGuardService,
    ProjectsService,
    UsersService,
    PermissionsService,
    Mp3ParserService,
    MediaPlayerService,
    LogoutComponent,
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
  ],
  bootstrap: [AppComponent],
  exports: [LogoutComponent],
})
export class AppModule {}
