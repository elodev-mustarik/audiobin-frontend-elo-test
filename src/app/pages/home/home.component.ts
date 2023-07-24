import {Component, OnInit} from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';
import {filter} from 'rxjs/operators';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {AuthService} from '../../services/auth/auth.service';
import {ELocalStorageKeys} from '../../enums/localStorageKeys.enum';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  // bread crumb items
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    public authService: AuthService
  ) {}
  // @ViewChild('loginButton') loginButton;
  public isCollapsed = false;
  token!: string;
  inputEmail: string = '';
  inputemailTOTP: string = "";
  inputTOTP: string = '';
  confirmEmail: string = '';
  awaitingEmailVerification: boolean = false;
  awaitingTOTPVerification: boolean = false;
  isFirstDotActive = true;
  isSecondDotActive = false;
  confirmEmailEntered: boolean = false;
  confirmToken: string = "";
  turnstileKey: string = "0x4AAAAAAADgXCuJhvrANld7";
  turnstileValid: boolean = false;

  gotturnstileToken(event: any){
    // console.log(`Resolved captcha with response: ${event}`);
    if (event != '') {
      this.turnstileValid = true;
    }
  }

  checkEmailMatch() {
    this.confirmEmailEntered = true;
  }

  ngOnInit(): void {
    this.authService.is_tauri_running = true;
    
    let isLoggedIn = this.authService.getLoggedInToken();
    if (isLoggedIn) {
      this.route.queryParams.subscribe(params => {
        const clonedParams = {...params};
        // Pass any other query params to other routes (Allows for passing the project id to open by default)
        delete clonedParams.token;
        delete clonedParams.uuid;
        console.log('going to main');
        this.router.navigate(['/main'], {queryParams: clonedParams});
      });
    }

    //Error
    this.route.queryParams.pipe(filter(params => params.error)).subscribe(params => {
      const snackbarRef = this.snackBar.open(`${params.error}!`, 'Close');
      snackbarRef.onAction().subscribe(_ => snackbarRef.dismiss());
    });

    // Login
    this.route.queryParams.pipe(filter(params => params.token)).subscribe(async params => {
      this.token = params.token;
      // Check if login token UUID is part of params
      if (params.uuid) {
        localStorage.setItem(ELocalStorageKeys.LOGIN_TOKEN_UUID, params.uuid);
      }
      const token = await this.authService.login(this.token);
      if (token) {
        this.authService.setTokenAndUser(token, this.authService.getUserFromToken(token));
        const clonedParams = {...params};
        // Pass any other query params to other routes (Allows for passing the project id to open by default)
        delete clonedParams.token;
        delete clonedParams.uuid;
        this.router.navigate(['/main'], {queryParams: clonedParams});
      } else {
        this.router.navigate(['/'], {
          queryParams: {error: 'Login Failed'},
        });
      }
    });
  }

  changeEvent() {
    // this.loginButton.focus();
  }

  onNoClick(): void {}

  goMain(): void {
    this.router.navigate(['/main']);
  }

  validateEmail(email: string, confirm: string): boolean {
    return (
      email.match(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      ) !== null && confirm === email
    );
  }

  async authenticate(): Promise<void> {
    this.isFirstDotActive = false;
    this.isSecondDotActive = true;

    const awaitingVerify = await this.authService.emailMagicLink(this.inputEmail);
    if (awaitingVerify) {
      this.awaitingEmailVerification = true;
    }
  }

  async getTOTP(): Promise<void> {
    this.isFirstDotActive = false;
    this.isSecondDotActive = true;

    const awaitingVerify = await this.authService.sendOTP(this.inputemailTOTP);
    if (awaitingVerify) {
      this.awaitingTOTPVerification = true;
    }
  }

  async authenticateTOTP(): Promise<void> {
    const awaitingVerify = await this.authService.loginWithTOTP(
      this.inputemailTOTP,
      this.inputTOTP
    );
    if (awaitingVerify) {
      this.router.navigate(['/main'], {});
    }
  }

  openMailbox(inputEmail: string) {
    const email = inputEmail; // user's email address
    const provider = email.split('@')[1];

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    switch (provider) {
      case 'gmail.com':
        if (isMobile) {
          window.location.href = 'googlegmail://co?to=&am=';
        } else {
          window.open('https://mail.google.com/mail/u/0/#inbox');
        }
        break;
      case 'yahoo.com':
        if (isMobile) {
          window.location.href = 'yahoo://mail/compose?to=';
        } else {
          window.open('https://mail.yahoo.com');
        }
        break;
      case 'outlook.com':
        if (isMobile) {
          window.location.href = 'ms-outlook://compose?to=';
        } else {
          window.open('https://outlook.live.com/owa/');
        }
        break;
      default:
        // Open a blank page if provider is not recognized
        window.open('data:text/html,');
    }
  }
}
