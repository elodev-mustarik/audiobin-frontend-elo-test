import { environment } from '../../../environments/environment';
import { IUser } from '../../interfaces/user.interface'
import { AuthService } from '../auth/auth.service';

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService, 
    private dialog: MatDialog,
  ) { }

  members_hidden: boolean = true;
  upload_disabled: boolean = true;

}
