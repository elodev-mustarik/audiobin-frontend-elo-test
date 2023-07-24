import {environment} from '../../../environments/environment';
import {Injectable} from '@angular/core';
import {EAuthAPIs} from '../../enums/apis.enum';
import {HttpClient} from '@angular/common/http';
import {IUser} from '../../interfaces/user.interface';
import decode from 'jwt-decode';
import {ELocalStorageKeys} from '../../enums/localStorageKeys.enum';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}

  is_tauri_running: boolean = false;

  async setTokenAndUser(token: string, user: IUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getLoggedInToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  };

  getUser = (): IUser | null => {
    const stringifiedUser = localStorage.getItem(USER_KEY);
    if (stringifiedUser === null) {
      return stringifiedUser;
    }
    return JSON.parse(stringifiedUser);
  };

  getUserFromToken = (token: string): IUser => {
    return decode(token);
  };

  login = async (token: string): Promise<string | undefined> => {
    try {
      const uuid = localStorage.getItem(ELocalStorageKeys.LOGIN_TOKEN_UUID);
      const loginBody = uuid === null ? {token} : {token, uuid};
      const loginResponse = await this.http
        .post<{message: string; token: string}>(
          `${environment.apiURL}${EAuthAPIs.LOGIN}`,
          JSON.stringify(loginBody),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            observe: 'response',
          }
        )
        .toPromise();

      return loginResponse?.body?.token;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };


  async sendOTP(email: string): Promise<boolean>{

    // const loginResponse = await this.http
    // .post<{message: string; token: string}>(
    //   `${environment.apiURL}getLoginTOTP`,
    //   JSON.stringify({email:email}),
    //   {
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     observe: 'response',
    //   }
    // )
    // .toPromise();

    return fetch(`${environment.apiURL}getLoginTOTP`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        origin: window.location.origin,
      }),
    })
      .then(response => {
        if (response.status === 200) {
          response.json().then(data => {
            // localStorage.setItem(ELocalStorageKeys.LOGIN_TOKEN_UUID, data.uuid);
          });
          return true;
        } else {
          throw new Error('Wrong Route');
        }
      })
      .catch(err => {
        console.error(err);
        return false;
      });



  }

  async loginWithTOTP(email: string, otp: string): Promise<boolean>{

    const loginResponse = await this.http
    .post<{message: string; error: string, token: any, user: any}>(
      `${environment.apiURL}loginWithTOTP`,
      JSON.stringify({email:email, TOTP: otp}),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        observe: 'response',
      }
    )
    .toPromise();

    let token = loginResponse?.body?.token;
    let userData = loginResponse?.body?.user;

    this.setTokenAndUser(token,userData);

    return true;

  }


  emailMagicLink = async (email: string): Promise<boolean> => {
    const url = environment.apiURL + EAuthAPIs.SEND_EMAIL_MAGIC_LINK;
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        origin: window.location.origin,
      }),
    })
      .then(response => {
        if (response.status === 200) {
          response.json().then(data => {
            localStorage.setItem(ELocalStorageKeys.LOGIN_TOKEN_UUID, data.uuid);
          });
          return true;
        } else {
          throw new Error('Wrong Route');
        }
      })
      .catch(err => {
        console.error(err);
        return false;
      });
  };

  updateUser = (user: IUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };
}
