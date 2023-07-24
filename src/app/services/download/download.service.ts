import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

const url = environment.apiURL + 'projects';
@Injectable({
  providedIn: 'root',
})
export class DownloadService {
  constructor(private http: HttpClient) {}

  async updateDownloadSetting(projectId: any, download: boolean = false) {
    console.log(download);
    const newUrl = `${url}/${projectId}?download=${download}`;
    console.log(url);
    return this.http.put(newUrl, {});
  }
}
