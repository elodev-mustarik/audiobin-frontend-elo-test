import { environment } from '../../../environments/environment';
import { IUser, Member } from '../../interfaces/user.interface'
import { AuthService } from '../../services/auth/auth.service';
import { ProjectsService, initialSelectedProject } from '../../services/project/projects.service';

import {
  ConfirmEditUserModel,
  EditableUsernameModalComponent,
} from '../../components/editable-username-modal/editable-username-modal.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../../components/yes-no/yes-no.dialog';

// import {} from '../../'

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import {
  HttpClient,
  HttpRequest,
  HttpEvent,
  HttpEventType,
  HttpHeaders,
  HttpErrorResponse,
  HttpHandler,
  HttpResponse,
} from '@angular/common/http';


@Injectable({
  providedIn: 'root',
})
export class UsersService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService, 
    private projects: ProjectsService,
    private dialog: MatDialog,
  ) { }

  snackbar_ref: any;
  user: any;

  members: Member[] = [];

  userName(email: string) {
    // Extract userName from email using Regex Pattern Capturing valid email before @ for positive lookahead method
    const regex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.?[a-z0-9!#$%&'*+/=?^_`{|}~-]+)(?=@)/gm;
    const userName = email.match(regex);
    return userName![0];
  }


  addUserName(user: any) {
    const formattedUsername = user.username === '' ? this.userName(user.email) : user.username;

    let dialogRef;

    const title = 'Edit Username';
    const message = `How would you like ${user.email} to be known as?`;
    const username = formattedUsername;
    const btnOkText = 'Confirm';
    const btnCancelText = 'Cancel';

    const dialogData = new ConfirmEditUserModel(title, username, message, btnOkText, btnCancelText);

    let config = {
      width: '416px',
      data: dialogData,
    };

    dialogRef = this.dialog.open(EditableUsernameModalComponent, config);

    dialogRef?.afterClosed().subscribe(newUsername => {
      if (typeof newUsername === 'string') {
        user.username = newUsername;
        this.authService.updateUser(user);
        const url = environment.apiURL + 'users/changeusername';

        this.http.put<any>(url, { newUsername: newUsername }).subscribe({
          next: _ => {
            const content = 'Username Updated Successfully';
            const action = 'Close';
            const snackbarRef = this.snackbar_ref.open(content, action, {
              duration: 2000,
              panelClass: ['success'],
            });
            snackbarRef.onAction().subscribe(_ => snackbarRef.dismiss());
          },
          error: _ => {
            user.username = username;
            const content = 'Failed to change username! Please try again after some time.';
            const action = 'Close';
            const snackbarRef = this.snackbar_ref.open(content, action, {
              panelClass: ['error'],
            });
            snackbarRef.onAction().subscribe(_ => snackbarRef.dismiss());
          },
        });
      }
    });
  }

  primaryAddress = '';

  async getInvitedMembers(project_id: number): Promise<any> {
    const url = environment.apiURL + 'shares/' + project_id;
    // console.log('initiating ' + url);
    return this.http.get(url).toPromise();
  }

  async getMembers() {
    var server_members = await this.getInvitedMembers(this.projects.current_project.id);
    this.members.length = 0;
    server_members.forEach((p: any[]) => {
      this.members.push({ id: p[1], name: p[6], email: p[4], accepted: p[3] });
    });
  }

  addMember() {
    // console.log("e: ", e);
    var emailReg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
    if (!emailReg.test(this.primaryAddress)) {
      alert('Enter valid email');
      return;
    }
    var url = environment.apiURL + 'shares';
    console.log(this);
    this.http
      .post<any>(url, {
        email: this.primaryAddress,
        project_id: this.projects.current_project.id,
        origin: window.location.origin,
      })
      .subscribe({
        next: _ => {
          this.members.push({
            id: 1,
            email: this.primaryAddress,
            name: this.primaryAddress,
            accepted: false,
          });
          this.primaryAddress = '';

          // console.log('Delete successful');
          // this.progressMaskVisibility = "hidden";
          // this.loadStems(this.current_project);
        },
        error: (error: HttpErrorResponse) => {
          console.warn(error);
          // Checking if the error status is 404
          if (error.status === 404) {
            
            this.dialog
              .open(ConfirmDialogComponent, {
                maxWidth: '400px',
                data: new ConfirmDialogModel(
                  'User not Registered!',
                  'Send sign-up project invite request?',
                  'Yes',
                  'No'
                ),
              })
              .afterClosed()
              .subscribe(async (sendEmail: boolean) => {
                // Resend request with register: true
                if (sendEmail) {
                  this.http
                    .post<any>(url, {
                      email: this.primaryAddress,
                      project_id: this.projects.current_project.id,
                      register: true,
                      origin: window.location.origin,
                    })
                    .subscribe({
                      next: _ => {
                        this.members.push({
                          id: 1,
                          email: this.primaryAddress,
                          name: this.primaryAddress,
                          accepted: false,
                        });
                        this.primaryAddress = '';
                      },
                    });
                }
              });
          } else {
            alert(error.error.message);
          }
        },
      });
  }

  async optOutMember() {
    this.dialog
      .open(ConfirmDialogComponent, {
        maxWidth: '400px',
        data: new ConfirmDialogModel(
          'Opt Out!',
          `Opt Out from ${this.projects.current_project.name} ?`,
          'Yes',
          'No'
        ),
      })
      .afterClosed()
      .subscribe(async (shouldDelete: boolean) => {
        if (shouldDelete) {
          var opt_out_url = environment.apiURL + 'optout/' + this.projects.current_project.id;
          this.http.delete<any>(opt_out_url).subscribe({
            next: async data => {
              const snackbarRef = this.snackbar_ref.open('Opt-out Successfully !', 'Close', {
                duration: 2000,
              });
              snackbarRef.onAction().subscribe(_ => snackbarRef.dismiss());
              this.projects.current_project = initialSelectedProject;
              await this.projects.getProjects();
              this.loadStems(this.projects.projects[0]);
              return true;
            },
            error: error => {
              console.error(error.message);
              return false;
            },
          });

          return true;
        }
      });
  }

  async removeMember(member: Member) {
    this.dialog
      .open(ConfirmDialogComponent, {
        maxWidth: '400px',
        data: new ConfirmDialogModel(
          'Remove User!',
          `Remove User from ${this.projects.current_project.name} ?`,
          'Yes',
          'No'
        ),
      })
      .afterClosed()
      .subscribe(async (shouldDelete: boolean) => {
        // Resend request with register: true
        if (shouldDelete) {
          var del_url = environment.apiURL + 'shares/' + this.projects.current_project.id + '/' + member.email;
          this.http.delete<any>(del_url).subscribe({
            next: data => {
              console.log('Delete successful');
              const snackbarRef = this.snackbar_ref.open('User Removed Successfully', 'Close', {
                duration: 2000,
              });
              snackbarRef.onAction().subscribe(_ => snackbarRef.dismiss());
              this.members = this.members.filter(current => current.id !== member.id);
              return true;
            },
            error: error => {
              console.error(error.message);
              return false;
            },
          });

          return true;
        }
      });
  }

  async loadStems(project?: any, selectedFileKey?: string): Promise<void> {}


}
