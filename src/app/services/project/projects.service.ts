import {environment} from '../../../environments/environment';

// import { UsersService } from '../../services/users/users.service'
import {NewProjectDialog} from '../../components/new-project/new-project.component';
import {ProjectSettingsDialog} from '../../components/project-settings/project-settings.component';
import {S3File} from '../../interfaces/S3File.interface';
import {PermissionsService} from '../../services/permissions/permissions.service';

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';

const url = environment.apiURL + 'projects';

interface Project {
  id: number;
  name: string;
  owner_id: number;
  bpm: number;
  signature: string;
  date_created: string;
  owner_email: string;
  owner_name: string;
  isDownloadable: boolean;
  description: string;
  playlist_id: string;
  playlist_data: any;
}

export const initialSelectedProject = {
  id: 0,
  name: '',
  owner_id: 0,
  bpm: 0,
  signature: '',
  date_created: '',
  owner_email: '',
  owner_name: '',
  isDownloadable: false,
  description: '',
  playlist_id: '',
  playlist_data: '',
};

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private dialog: MatDialog,
    // private users: UsersService,
    private permissions: PermissionsService
  ) {}

  projects: Project[] = [];
  files: S3File[] = [];

  current_project: Project = {
    id: 0,
    name: '',
    owner_id: 0,
    bpm: 120,
    signature: '4/4',
    date_created: '',
    owner_email: '',
    owner_name: '',
    isDownloadable: false,
    description: '',
    playlist_id: '',
    playlist_data: '',
  };
  defaultProjectSelectedId?: number;
  members_hidden = true;
  snackbar_ref: any;
  progressMaskVisibility = '';
  progress_text = '';

  /* Project Functions */
  /* ================= */

  async loadStems(project?: any, selectedFileKey?: string): Promise<void> {}

  async getProjects(): Promise<void> {
    this.files.length = 0;
    console.log('initiating');
    // console.log("user: ", this.getUser());
    this.progress_text = 'Loading project list';
    this.progressMaskVisibility = 'visible';

    var server_projects = await this.fetchProjects();
    this.projects.length = 0;
    server_projects.forEach((p: any[]) => {
      // console.log({project: p});
      this.projects.push({
        id: p[0],
        name: p[1],
        owner_id: p[2],
        bpm: p[3],
        signature: p[4],
        date_created: p[5],
        isDownloadable: p[6] === 1 ? true : false,
        description: p[7],
        playlist_id: p[8],
        playlist_data: p[9],
        owner_email: p[10],
        owner_name: p[11],
      });
    });
    this.progressMaskVisibility = 'hidden';

    // console.log('projects: ', this.projects);
    // console.log(this.projects[0].name);
  }

  async projectSettings(project: Project, user_id: any): Promise<void> {
    let dialogRef;

    var filedata: any[] = [];

    this.files.forEach((file: S3File) => {
      if (file.isAudio || file.isVideo || file.type === 'PDF') {
        filedata.push({
          name: file.filename,
          type: file.type,
          s3url: file.s3Url,
          s3key: file.key,
          isAudio: file.isAudio,
          isVideo: file.isVideo,
        });
      }
    });

    let config = {
      data: {
        project_id: project.id,
        project_name: project.name,
        owner_id: project.owner_id,
        project_bpm: project.bpm,
        project_sig: project.signature,
        owner_email: project.owner_email,
        owner_name: project.owner_name,
        isDownloadable: project.isDownloadable,
        project_description: project.description,
        user_id: user_id,
        files: filedata,
      },
    };

    dialogRef = this.dialog.open(ProjectSettingsDialog, config);

    dialogRef?.afterClosed().subscribe(result => {
      // console.log("The dialog was closed");
      // console.log("dialog result: ", result);
      if (result === 2) {
        this.getProjects();
        this.current_project = initialSelectedProject;
        this.permissions.upload_disabled = true;
        const snackbarRef = this.snackbar_ref.open('Project Deleted Successfully', 'Close', {
          duration: 4000,
        });
        snackbarRef.onAction().subscribe(_ => snackbarRef.dismiss());
      }
    });
  }

  async newProject(user_id: any): Promise<void> {
    // TODO: create a record in database with relation to user, and folder in S3.
    let dialogRef;

    let config = {
      width: '480px',
      data: {
        owner_id: user_id,
      },
    };

    dialogRef = this.dialog.open(NewProjectDialog, config);

    dialogRef?.afterClosed().subscribe(async result => {
      if (typeof result === 'number') {
        this.current_project = initialSelectedProject;
        await this.getProjects();
        this.defaultProjectSelectedId = result;
        const newProject = this.projects.find(project => project.id === result);

        if (newProject) this.loadStems(newProject);
      }
    });
  }

  async shareProject(project: Project): Promise<void> {
    this.permissions.members_hidden = !this.permissions.members_hidden;
  }

  async createNewProject(params: any): Promise<number> {
    console.log(url);

    const resp = await this.http.post<any>(url, params).toPromise();
    return resp;
  }

  async updateProject(params: any): Promise<boolean> {
    this.http.put<any>(url, params).subscribe({
      next: () => {
        console.log('Update successful');
        this.refreshView(params);
        return true;
      },
      error: error => {
        console.error(error.message);
        return false;
      },
    });

    return true;
  }

  async fetchProjects(): Promise<any> {
    // console.log('initiating ' + url);
    return this.http.get(url).toPromise();
  }

  async deleteProject(project_id: number): Promise<boolean> {
    var del_url = url + '/' + project_id;
    this.http.delete<any>(del_url).subscribe({
      next: () => {
        console.log('Delete successful');
        return true;
      },
      error: error => {
        console.error(error.message);
        return false;
      },
    });

    return true;
  }

  async sendSkytracks(params: any): Promise<boolean> {
    this.setProgress(true, 'Uploading data to SkyTracks...');

    const st_url = environment.apiURL + 'sendtoskytracks';
    this.http.post<any>(st_url, params).subscribe({
      next: data => {
        console.log('data from sendtoskytracks post:', data);
        console.log('Sent successfully');
        this.setProgress(false, '');
        return true;
      },
      error: error => {
        console.error('error', error.error);
        alert(error.error);
        this.setProgress(false, '');
        return false;
      },
    });

    return true;
  }

  async setProgress(visible: boolean, progress_text: string) {}

  async refreshView(value: Record<string, any> | number) {
    if (typeof value !== 'number') {
      const captureParams = value['params'];
      await this.router.navigate(['main']);
      await this.router.navigate(['main'], {
        queryParams: {
          owner_email: captureParams['owner_email'],
          project_name: encodeURI(captureParams['project_name']),
          project_id: captureParams['project_id'],
        },
      });
    }
  }
}
