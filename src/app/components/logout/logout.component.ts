import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss'],
})
export class LogoutComponent implements OnInit {
  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {}

  logout(userClickedLogout: boolean = true) {
    const url = environment.apiURL + 'logout';
    if (userClickedLogout) {
      this.http
        .post<boolean>(url, {})
        .toPromise()
        .then()
        .catch(err => console.error(err));
    }
    localStorage.clear();
    this.router.navigate(['/']);
  }
}
