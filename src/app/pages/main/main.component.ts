import {environment} from '../../../environments/environment';
import {ProjectsService, initialSelectedProject} from '../../services/project/projects.service';
import {AuthService} from '../../services/auth/auth.service';
import {UsersService} from '../../services/users/users.service';
import {PermissionsService} from '../../services/permissions/permissions.service';
import {MediaPlayerService} from '../../services/mediaPlayer/mediaPlayer.service';

import {ConfirmDialogComponent, ConfirmDialogModel} from '../../components/yes-no/yes-no.dialog';
import {S3File} from '../../interfaces/S3File.interface';
import {PlayerComponent} from '../../components/player/player.component';

import {Component, ElementRef, OnInit} from '@angular/core';
import {LegacyProgressSpinnerMode as ProgressSpinnerMode} from '@angular/material/legacy-progress-spinner';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';
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

import {Uppy, UppyFile} from '@uppy/core';
import DropTarget from '@uppy/drop-target';
// import AwsS3 from '@uppy/aws-s3';
import AwsS3Multipart from '@uppy/aws-s3-multipart';

import {ActivatedRoute, Router} from '@angular/router';
import {lastValueFrom, Observable, Subject} from 'rxjs';
import {first, map, startWith, take} from 'rxjs/operators';
import {io, Socket} from 'socket.io-client';
import {FormControl} from '@angular/forms';
import {
  ConfirmEditUserModel,
  EditableUsernameModalComponent,
} from '../../components/editable-username-modal/editable-username-modal.component';
import {ViewChild} from '@angular/core';
import {trigger, transition, style, animate, query, stagger} from '@angular/animations';
import {MatDrawer} from '@angular/material/sidenav';
import {NotemodalComponent} from '../../components/notemodal/notemodal.component';
import { Command } from '@tauri-apps/api/shell'
import { resolveResource } from '@tauri-apps/api/path';
import {invoke} from '@tauri-apps/api/tauri';
import {FileEditModalComponent} from '../../components/file-edit-modal/file-edit-modal.component';
import {FileRenameComponent} from '../../components/file-rename/file-rename.component';

export const titleAnimation = trigger('titleAnimation', [
  transition(':enter', [style({opacity: 0}), animate('600ms ease', style({opacity: 1}))]),
  transition(':leave', [style({opacity: 1}), animate('800ms', style({opacity: 0}))]),
  transition(':enter', [style({opacity: 0}), animate('600ms ease', style({opacity: 1}))]),
  transition(':leave', [style({opacity: 1}), animate('800ms', style({opacity: 0}))]),
]);

declare var tidioChatApi: any;

const listAnimation = trigger('listAnimation', [
  transition('* <=> *', [
    query(
      ':enter',
      [style({opacity: 0}), stagger('80ms', animate('400ms ease-out', style({opacity: 1})))],
      {optional: true}
    ),
    query(
      ':leave',
      animate(
        '500ms ease-in',
        style({opacity: 0, display: 'none', transform: 'translateX(100px)'})
      ),
      {
        optional: true,
      }
    ),
  ]),
]);
/**
 * @title Autosize sidenav
 */

interface Info {
  path: string;
  filename: string;
}

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
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  animations: [titleAnimation, listAnimation],
})
export class MainComponent implements OnInit {
  @ViewChild(PlayerComponent)
  playerComponent!: PlayerComponent;

  primaryEmailControl = new FormControl('');
  options: string[] = [];
  filteredEmails!: Observable<string[]>;
  activities: any[] = [];
  isActivityLogVisible = false;
  project_id = 0;
  activitiesLimit = 10;
  offset = 0;
  newActivitiesCount: number = 0;
  loadingActivities = false;
  noMoreActivitiesData = false;
  fileUploadNote: string = '';
  buttonClicked: boolean = false;
  audioFilesReadyToLoad: boolean = true;
  isFilledButton: boolean = false;

  chatShown: boolean = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    public authService: AuthService,
    public permissions: PermissionsService,
    public projects: ProjectsService,
    public users: UsersService,
    public player: MediaPlayerService
  ) {}

  uppy: Uppy = new Uppy({
    debug: false,
    autoProceed: true,
  });

  isDrawerOpen: boolean = true;
  selectedFiles: any = []; // Create an empty array to store selected files
  lightWhite = '#ffffff0d';
  lightBlue = '#99bdff26';
  primaryBlue = '#99bdff';

  filesDeletionID: any = null;
  files_to_delete = 0;
  files_deleted = 0;

  files_uploaded: any = null;

  preventSingleClick = false;
  timer: any;
  delay: number = 300;

  progressMaskVisibility: 'hidden' | 'visible' = 'hidden';
  progress_text = 'working...';
  progress_indeterminate: ProgressSpinnerMode = 'indeterminate';
  progress_determinate: ProgressSpinnerMode = 'determinate';
  progress_mode = this.progress_indeterminate;
  progress_value = 0;
  progress_current_file = '';

  playlist_mode = false;

  files: S3File[] = [];
  tags: string[] = [];

  videoConversion: any = null;

  hasBaseDropZoneOver: boolean = false;

  socket!: Socket;

  buttonclick_buffer: AudioBuffer = this.player.ctx.createBuffer(2, 1, this.player.ctx.sampleRate);



  activitiesUrl = (project_id: number, limit: number, offset = 0) => {
    return `${environment.apiURL}activities?project_id=${project_id}&limit=${limit}&offset=${offset}`;
  };

  async ngOnInit(): Promise<void> {
    this.authService.is_tauri_running = true;
    this.projects.snackbar_ref = this.snackBar;
    this.projects.setProgress = (visible, progresstext) => this.setProgress(visible, progresstext);
    this.projects.loadStems = (project?, selectedFileKey?) =>
      this.loadStems(project, selectedFileKey);
    this.users.loadStems = (project?, selectedFileKey?) => this.loadStems(project, selectedFileKey);

    this.users.snackbar_ref = this.snackBar;

    this.users.user = this.authService.getUser();
    let socketTimer;
    let connectSocket = () => {
      this.socket = io(environment.socketURL, {
        transports: ['websocket'],
        auth: {
          token: this.authService.getLoggedInToken(),
        },
      });
    };
    // console.log("user: ", this.user);
    connectSocket();
    this.socket.on('connect', () => {
      console.log('Socket Connected Succesfully');
      clearInterval(socketTimer);
    });
    this.socket.on('disconnect', () => {
      socketTimer = setInterval(() => {
        connectSocket();
      }, 200);
      this.setProgress(false, '', 0);
    });

    this.route.queryParams.subscribe(async params => {
      if (params['project_id']) {
        await this.projects.getProjects();
        const queryParamProjectId = parseInt(params['project_id']);
        const defaultProjectSelection = this.projects.projects.find(
          project => project.id === queryParamProjectId
        );
        if (defaultProjectSelection !== undefined) {
          this.projects.defaultProjectSelectedId = queryParamProjectId;
          if (params['file_key']) {
            this.projects.loadStems(defaultProjectSelection, params['file_key']);
          } else {
            // console.log(params);
            this.projects.loadStems(defaultProjectSelection);
          }
        }
      } else {
        this.projects.setProgress = (visible, progresstext) =>
          this.setProgress(visible, progresstext);
        this.projects.getProjects();
      }
    });

    window
      .fetch('assets/sounds/buttonclick.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => this.player.ctx.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.buttonclick_buffer = audioBuffer;
      });

    const projectsUrl = environment.apiURL + 'projects';
    // console.log('projectsUrl', projectsUrl);
    this.http
      .get<string[]>(environment.apiURL + 'projects' + '/sharedcontacts')
      .subscribe(commonEmails => {
        // console.log(commonEmails);
        this.options = commonEmails;
        // console.log(`Options are`, this.options);

        this.filteredEmails = this.primaryEmailControl.valueChanges.pipe(
          startWith(''),
          map(value => this._matchEmail(value || ''))
        );
      });

    this.activityLogDiv.nativeElement.addEventListener('scroll', this.onScroll.bind(this));
  }

  ngOnDestroy(): void {
    this.activityLogDiv.nativeElement.removeEventListener('scroll', this.onScroll.bind(this));
  }

  private _matchEmail(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.options.filter(option => option.toLowerCase().includes(filterValue));
  }

  isTauri (): boolean{
    // return true; // for testing the recorder starter button.
    return window.location.origin.includes('tauri')
  }
  async shellRecorder() {
    this.openRecorder();

    // // const resourcePath: string = await resolveResource('binaries/recorder');
    // const resourcePath: string = "/Applications/AudioBin Recorder/Contents/MacOS/AudioBin Recorder";
    // console.log(resourcePath);
    // // const command: Command  = new Command(resourcePath);
    // const command: Command  = Command.sidecar(resourcePath);
    // command.execute().then(cmdOutput => {
    //   // Do something with the commandOutput after the Promise executions is resolved
    //   // ...
    //   console.log(cmdOutput);
    // });

  }

  initializeUppy() {
    // console.log('InitializeUppy()');
    this.uppy.close({reason: 'unmount'});
    this.uppy.close({reason: 'unmount'});
    this.uppy = new Uppy({
      debug: false,
      autoProceed: false,
    });

    const token = this.authService.getLoggedInToken();
    const owneremail = this.projects.current_project.owner_email;
    const projectname = this.projects.current_project.name;

    this.uppy.on('files-added', files => {
      const dialogRef = this.dialog.open(NotemodalComponent, {
        width: '480px',
        data: files,
      });

      dialogRef.afterClosed().subscribe((result: string) => {
        if (result) {
          if (result === ' ') result = '';
          this.fileUploadNote = result;
          files.forEach(file => {
            this.uppy.setFileMeta(file.id, {
              name: file.name,
              project_id: this.projects.current_project.id,
              uploader_email: this.users.user.email,
              note: this.fileUploadNote,
            });
          });
          this.uppy.upload();
        } else {
          this.uppy.cancelAll();
          return;
        }
      });
    });

    this.uppy.on('progress', progress => {
      if (this.permissions.upload_disabled) return;
      this.setProgress(progress > 0, 'Uploading your selection of files ', progress);
    });

    this.uppy.on('complete', result => {
      this.files_uploaded = result.successful;
      const uploadedFiles = result.successful;
      console.log('files_uploaded', this.files_uploaded);
      const body = {
        files: uploadedFiles.map(file => file.name).join('||'),
        project_id: uploadedFiles[0].meta.project_id,
        uploader_email: uploadedFiles[0].meta.uploader_email,
        note: uploadedFiles[0].meta.note,
      };
      console.log('activities', body);
      this.http.post(`${environment.apiURL}activities`, body).subscribe({
        next: _ => {
          console.log('Activity Logged');
          this.setProgress(false, '');

          this.files_uploaded.forEach(file => {
            this.uppy.removeFile(file.id);
          });
          this.loadStems();
        },
        error: error => {
          console.error(`Couldn't Log the Activity`);
        },
      });
      // }

      // if (this.permissions.upload_disabled) return;

      // console.log('successful files:', result.successful);
      // console.log('failed files:', result.failed);
    });

    this.uppy.on('error', error => {
      console.log(error);
    });

    this.uppy.use(DropTarget, {
      target: document.getElementById('files-area') as Element,
      onDragOver: (event: any) => {
        this.fileOverBase(event);
      },
      onDrop: (event: any) => {
        this.hasBaseDropZoneOver = false;
      },
      onDragLeave: (event: any) => {
        this.hasBaseDropZoneOver = false;
      },
    });

    this.uppy.use(AwsS3Multipart, {
      limit: 4,
      companionUrl: environment.apiURL,
      companionHeaders: {
        Authorization: `Bearer ${token}`,
      },

      getChunkSize(file: UppyFile): number {
        return file.size / 8000;
      },

      async createMultipartUpload(file: UppyFile) {
        const metadata = {};

        // metadata['note'] = this.fileUploadNote;
        Object.keys(file.meta || {}).forEach(key => {
          console.log({key});
          if (file.meta[key] != null) {
            metadata[key] = String(file.meta[key]);
          }
        });

        const response = await fetch(environment.apiURL + 's3/multipart', {
          method: 'POST',
          // Send and receive JSON.
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: `${owneremail}/${projectname}/${file.name}`,
            type: file.type,
            metadata: metadata,
          }),
        });

        if (!response.ok) throw new Error('Unsuccessful request');

        // Parse the JSON response.
        const data = await response.json();

        return data;
      },

      async signPart(file, {uploadId, key, partNumber, signal}) {
        if (signal?.aborted) {
          const err = new DOMException('The operation was aborted', 'AbortError');
          Object.defineProperty(err, 'cause', {
            configurable: true,
            writable: true,
            value: signal.reason,
          });
          throw err;
        }

        if (uploadId == null || key == null || partNumber == null) {
          throw new Error('Cannot sign without a key, an uploadId, and a partNumber');
        }

        const filename = encodeURIComponent(key);
        const response = await fetch(
          environment.apiURL + `s3/multipart/${uploadId}/${partNumber}?key=${filename}`,
          {
            method: 'GET',
            // Send and receive JSON.
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error('Unsuccessful request');

        const data = await response.json();

        return data;
      },

      async listParts(file, {key, uploadId}) {
        const filename = encodeURIComponent(key);
        const response = await fetch(
          environment.apiURL + `s3/multipart/${uploadId}?key=${filename}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error('Unsuccessful request');

        const data = await response.json();

        return data;
      },
      async completeMultipartUpload(file, {key, uploadId, parts}) {
        // if (signal?.aborted) {
        //   const err = new DOMException('The operation was aborted', 'AbortError')
        //   Object.defineProperty(err, 'cause', { configurable: true, writable: true, value: signal.reason })
        //   throw err
        // }

        const filename = encodeURIComponent(key);
        const uploadIdEnc = encodeURIComponent(uploadId);
        const response = await fetch(
          environment.apiURL + `s3/multipart/${uploadIdEnc}/complete?key=${filename}`,
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({parts}),
          }
        );

        if (!response.ok) throw new Error('Unsuccessful request');

        const data = await response.json();

        return data;
      },
    });
  }

  async openRecorder() {
    const ret = await invoke('open_recorder', {});
  }

  async toggleChat() {
    if (!this.authService.is_tauri_running) {
      tidioChatApi.setVisitorData({
        distinct_id: this.users.user.id,
        email: this.users.user.email,
        name: this.users.user.userName,
      });
      tidioChatApi?.display(true);
      tidioChatApi?.open();
    } else {
      await invoke('open_docs', {});
    }
  }

  sendUploadedEmail() {
    const url = environment.apiURL + 'senduploademail';
    const token = this.authService.getLoggedInToken();

    // Call API to send email with LIST of files
    fetch(url, {
      method: 'post',
      // Send and receive JSON.
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        files: this.files_uploaded,
        note: this.files_uploaded[0].meta.note,
        userEmail: this.users.user.email,
        projectName: this.projects.current_project.name,
        projectId: this.projects.current_project.id,
      }),
    })
      .then(response => {
        // Parse the JSON response.
        // console.log(response.json);
        // console.log('response one');
      })
      .then((data: any) => {
        // Return an object in the correct shape.
        // console.log('response two');
        this.files_uploaded = null;
      });
  }

  showUploadProgress(progress: any) {
    this.setProgress(
      true,
      'Uploading file ' + this.progress_current_file + ' - ' + progress + '%',
      progress
    );
  }

  startUpload() {
    this.buttonClicked = true;
    (document.getElementById('input_button') as HTMLElement).click();
  }

  finishUpload(event: any) {
    const files = Array.from(event.target.files);
    const updateFiles = files.map((file: any) => ({
      source: 'file input',
      name: file.name,
      type: file.type,
      data: file,
      meta: {
        project_id: this.projects.current_project.id,
        uploader_email: this.users.user.email,
      },
    }));
    this.uppy.addFiles(updateFiles);
  }

  fileOverBase(e: any): void {
    if (!this.permissions.upload_disabled) this.hasBaseDropZoneOver = e;
  }

  humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
      return bytes + ' B';
    }

    const units = si
      ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
      : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10 ** dp;

    do {
      bytes /= thresh;
      ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

    return bytes.toFixed(dp) + ' ' + units[u];
  }

  doubleClick(file: S3File) {
    this.preventSingleClick = true;
    clearTimeout(this.timer);

    // if (file.isImage) {
    //   window.open(file.s3Url, '_blank');
    // }
    if ((file.isVideo || file.isImage) && file.type !== 'PDF') {
      file.largeVideo = !file.largeVideo;
    } else if (file.type === 'TXT') {
      /**
       * * Downloading as blob and creating url to view with iframe
       */
      const req = this.http.get<Blob>(file.s3Url, {
        observe: 'response',
        responseType: 'blob' as 'json',
      });
      req.subscribe(
        async (response: any) => {
          var data = new Blob([response.body], {
            type: 'text/plain',
          });
          const textFile = URL.createObjectURL(data);
          window.open(textFile, '_blank');
        },
        error => {
          console.log(error);
        }
      );
    } else if (file.type === 'PDF') {
      window.open(file.s3Url, '_blank');
    }
  }

  async singleClickFile(file: S3File) {
    this.preventSingleClick = false;
    this.timer = setTimeout(() => {
      if (!this.preventSingleClick) {
        this.chooseFile(file.key);
      }
    }, this.delay);
  }

  async selectAllFiles(checked: boolean) {
    // console.log('Event', checked);
    let wasPLaying = this.player.isPlaying;
    await this.player.stop();

    // Clear the selectedFiles array before adding files
    this.selectedFiles = [];
    // console.log('ready for playing from selection change');
    for (let i = 0; i < this.files.length; i++) {
      let file = this.files[i];

      file.checked = checked;
      if (file.checked) {
        this.selectedFiles.push(file);
        console.log('select all files', file);
      } else {
        this.selectedFiles = [];
      }
      this.playerComponent.chooseFile(file.key, file.checked);
      this.selectFile(file.key, false);
    }
    let found_checked = false;
    for (const file of this.files) {
      if (file.checked) {
        found_checked = true;
      }
    }
    this.player.actiondisabled = !found_checked;

    // console.log('calling getMaxDuration');
    await this.player.getMaxDuration();

    this.player.playdisabled = !(this.player.got_audio_files || this.player.got_video_files);
    if (wasPLaying) {
      await this.player.play();
    }
  }

  chooseFile = (key: string, getDuration: boolean = true) => {
    for (const file of this.files) {
      if (file.key === key) {
        this.playerComponent.chooseFile(file.key, !file.checked);
        this.selectFile(file.key, getDuration);

        //selected files tags edit stats form here
        if (!file.checked && file.key === key) {
          this.selectedFiles.push(file);
        } else {
          const index = this.selectedFiles.findIndex(selectedFile => selectedFile.key === file.key);
          if (index !== -1) {
            // Remove the file from the array if it was deselected
            this.selectedFiles.splice(index, 1);
          }
        }

        break;
      }
    }
  };

  selectFile = (key: string, getDuration: boolean = true): void => {
    let file;
    for (const tmpFile of this.files) {
      if (tmpFile.key === key) {
        file = tmpFile;
        break;
      }
    }

    // this makes the selection click and allows playback of stems the first time.
    let was_playing = this.player.isPlaying;

    if (file.isVideo && file.show_spinner === 'visible') return;

    this.player.stop().then(() => {
      const source = this.player.ctx.createBufferSource();
      source.buffer = this.buttonclick_buffer;
      source.connect(this.player.masterGainNode);
      source.start();

      if (getDuration) {
        file.checked = !file.checked;
        this.player.got_audio_files = false;
        this.player.got_video_files = false;
      }

      if (file.checked) {
        file.backcolor = this.lightBlue;
        file.border = `1px solid ${this.primaryBlue}`;
        file.checkmark = 'visible';
      } else {
        file.backcolor = '#ffffff0d'; //SCSS $Light_White Color
        file.border = '1px solid #323232';
        file.checkmark = 'hidden';
      }

      if (getDuration) {
        let found_checked = false;
        this.files.forEach(async (file: S3File) => {
          if (file.checked) {
            found_checked = true;
          }
        });
        this.player.getMaxDuration().then(() => {
          // console.log(
          //   'in selectfile: this.player.got_audio_files and this.player.got_video_files',
          //   this.player.got_audio_files,
          //   this.player.got_video_files
          // );
          this.player.actiondisabled = !found_checked;
          if (was_playing) {
            // console.log('ready for playing from selection change');
            this.player.play();
          }
        });
      }
    });
  };

  loadVideoTime(file: S3File) {
    let video_element = document.getElementById(file.key) as HTMLVideoElement;
    file.duration = video_element.duration;
    file.videoLoaded = true;
    // console.log ('videoLoaded switched to true');
  }
  waitForVideoConversion() {
    let videoLoadComplete = true;

    for (var i = 0; i < this.files.length; i++) {
      let file: S3File = this.files[i];

      if (file.isVideo) {
        if (file.videoLoaded === true) {
          // console.log('hiding spinner for video');
          file.show_spinner = 'hidden';
        } else {
          let video_element = document.getElementById(file.key) as HTMLVideoElement;
          video_element.src = file.s3Mp4Url;
          // console.log('video complete is still false');
          videoLoadComplete = false;
        }
      }
    }
    // see if all videos have been loaded.

    if (videoLoadComplete) {
      clearInterval(this.videoConversion);
      this.videoConversion = null;
      return;
    }
  }

  /* Stems Functions */
  /* =============== */

  async loadStems(project?: any, selectedFileKey?: string): Promise<void> {
    if (project === undefined) {
      project = this.projects.current_project;
    }

    console.log('load stems', project);

    await this.player.stop().then(async () => {
      this.audioFilesReadyToLoad = false;
      this.player.downloadDisabled = project.isDownloadable;
      console.log('project id: ', project.id);
      this.player.slider_position = 0.0;
      this.projects.current_project = project;
      this.files.length = 0;
      this.files = [];
      this.tags = [];
      this.selectedFiles = [];
      this.player.playdisabled = true;
      this.player.deletedisabled = this.projects.current_project.owner_id != this.users.user.id;
      if (!this.permissions.members_hidden)
        this.permissions.members_hidden =
          this.projects.current_project.owner_id != this.users.user.id;
      this.project_id = this.projects.current_project.id;
      this.playlist_mode = localStorage.getItem('mode_' + this.project_id) === '1' ? true : false;
      var url =
        environment.apiURL +
        'stems' +
        `?owner_email=${project.owner_email}&project_name=${project.name}&project_id=${project.id}`;

      this.socket.emit('checkingConnection', () => {
        // console.log('connected');
      });

      this.socket.on('checkingConnection', v => {
        // console.log(v);
      });

      // console.log(url);
      this.setProgress(true, 'Fetching Files', 0);

      // console.log("initiating " + url);

      // let data = await this.http.get<any>(url).toPromise();

      let data: any = null;

      let getfilesinfos: any = {
        owner_email: this.projects.current_project.owner_email,
        project_name: this.projects.current_project.name,
        project_id: this.projects.current_project.id,
      };

      // console.log(getfilesinfos);
      this.socket = io(environment.socketURL, {
        transports: ['websocket'],
        auth: {
          token: this.authService.getLoggedInToken(),
        },
        query: {getfilesinfos: JSON.stringify(getfilesinfos)},
      });

      // Socket connection notifier
      this.socket.emit('getFiles', () => {
        // console.log(`Socket connected to ${environment.socketURL}. Socket id = ${this.socket.id}`);
        this.setProgress(true, 'Fetching files. This may take a while...');
      });

      this.socket.on('progress', async (p: any) => {
        // console.log(p);
        // console.log('progress: ' + p.value);
        if (p.receiveStems !== undefined) {
          let values = p.receiveStems;
          if (values.status !== 'Complete') {
            let progressValue: number =
              (parseInt(values.numfilesdone) / parseInt(values.numfiles)) * 100;

            // console.log('progresses',progressValue, values.numfilesdone, values.numfiles);

            this.setProgress(
              true,
              `${values.status} ${values.currentFile}...[${progressValue.toFixed(0)}%]`,
              progressValue
            );
          }

          if (values.status === 'Complete') {
            // console.log('Reloading Stems');
            this.audioFilesReadyToLoad = true;
            this.setProgress(false, '', 0);
            data = values.contents;
          }
        }

        if (data !== null) {
          if (data.length > 0) {
            (document.getElementById('upload_message') as HTMLElement).style.display = 'none';
          } else {
            (document.getElementById('upload_message') as HTMLElement).style.display = 'block';
          }

          for (var i = 0; i < data.length; i++) {
            // console.log("data: " + data[i]["filename"]); // <-- asigno los valores a la propiedad del componente
            const filepath = data[i]['key'];
            const filename = data[i]['filename'];
            const filesize = data[i]['filesize'];

            const mp3filesize = data[i]['mp3filesize'];
            let duration = data[i]['duration'];

            const signedurl = data[i]['signedurl'];
            const pngUrl = data[i]['signedpngurl'];
            const mp3Url = data[i]['signedmp3url'];
            const mp4Url = data[i]['signedmp4url'];
            // console.log('data[i][\'signedmp4url\']',data[i]['signedmp4url']);

            const imageUrl = data[i]['signedimageurl'];

            const isAudio = data[i]['isaudiofile'];
            const isVideo = data[i]['isvideofile'];
            const isImage = data[i]['isimagefile'];

            let tagset: any = data[i]['tagset'];
            let fileNote: any = data[i]['fileNote'];
            if (isAudio) {
              // if (tagset.length === 0) {
              //   // console.log('No tagset');
              //   // tagset = [{Key: 'All'}];
              //   // console.log(tagset);
              // } else {
              //   // console.log('tagset',tagset);
              // }

              for (let i = 0; i < tagset.length; i++) {
                let tag = tagset[i].Key;
                if (!this.tags.includes(tag)) {
                  this.tags.push(tag);
                }
              }
            }
            this.tags.sort();

            var type = filename.substr(filename.lastIndexOf('.') + 1).toUpperCase();

            var displayImage = 'none';

            if (isAudio) displayImage = 'inline';
            // console.log('Processing', data[i]['processing']);
            const processing = data[i]['processing'] ?? false;

            this.files.push({
              index: i,
              key: filepath,
              tagset: tagset,
              s3Url: signedurl,
              s3PngUrl: pngUrl,
              s3Mp3Url: mp3Url,
              s3Mp4Url: mp4Url,
              s3ImageUrl: imageUrl,
              filename: filename,
              filesize: filesize,
              mp3filesize: mp3filesize,
              type: type,
              isAudio: isAudio,
              isVideo: isVideo,
              isImage: isImage,
              videoLoaded: false,
              largeVideo: false,
              imageDisplay: displayImage,
              audio: new Audio(),
              duration: duration,
              processing,
              show_spinner: 'visible',
              isdownloading: false,
              checked: false,
              volume: 0,
              backcolor: '#ffffff0d',
              checkmark: 'hidden',
              border: `1px solid #323232`,
              buffer_range_start: 0,
              source: [],
              preloadedFrames: [],
              nextStartTime: 0,
              packetPointer: 0,
              framePointer: 0,
              codecContextPointer: 0,
              filterGraph: [0, 0, 0],
              fileNote: fileNote,
            });
            let file = this.files[this.files.length - 1];
          }

          // for (let file of this.files){
          //   await this.player.fetchMP3Header(file);
          // }

          const selectedFile = this.files.find(file => file.key === selectedFileKey);

          if (selectedFile !== undefined) {
            this.chooseFile(selectedFile.key);
          }

          // attempt card sorting:
          this.files = this.sortAlpha(this.files, 'filename');

          this.player.files = this.files;
          this.playerComponent.loadFiles();

          await this.player.initLibAV();

          this.permissions.upload_disabled = false;
          this.player.slider_position = 0.0;
          this.player.slider_offset = 0;
          await this.users.getMembers();

          if (this.files_uploaded != null) {
            this.sendUploadedEmail();
          }
          await this.player.getMaxDuration();
          this.videoConversion = setInterval(() => this.waitForVideoConversion(), 1000);
          this.initializeUppy();
        }
      });
      this.fetchActivities(this.projects.current_project.id, this.activitiesLimit);
    });
  }

  sortAlpha(array, field: any) {
    return array.sort((a, b) => (a[field] < b[field] ? -1 : Number(a[field] > b[field])));
  }
  sortAlpha2(array, field) {
    return array.sort((a, b) => {
      const numeric = /^[-+]??\d+/;

      const isNumericA = numeric.test(a[field]);
      const isNumericB = numeric.test(b[field]);
      // e.g. compare 5 and 6
      if (isNumericA && isNumericB) {
        return parseInt(a[field], 10) - parseInt(b[field], 10);
      }

      // e.g. 5 and A2
      if (isNumericA && !isNumericB) {
        return -1;
      }

      // e.g. A2 and 6
      if (!isNumericA && isNumericB) {
        return 1;
      }

      const alphabets = /^[a-zA-Z]+/;
      // Alphabet + number: A1, B3...
      const aAlphabets = a[field].replace(/\d+/g, '');
      const bAlphabets = b[field].replace(/\d+/g, '');
      if (aAlphabets === bAlphabets) {
        // e.g. Compare AB10 and AB12
        const aNumber = a[field].replace(alphabets, '');
        const bNumber = b[field].replace(alphabets, '');
        // e.g. Compare 10 and 12 for AB10 and AB12
        const result = aNumber === bNumber ? 0 : parseInt(aNumber, 10) - parseInt(bNumber, 10);
        // console.log(`A: ${a}, B: ${b}, result: ${result}`)
        return result;
      }
      // e.g. A12 and B12
      return aAlphabets > bAlphabets ? 1 : -1;
    });
  }

  onDrawerButtonClick = () => {
    this.toggleNotification();
  };

  checkForTag(file: S3File, tag: string) {
    for (let i = 0; i < file.tagset.length; i++) {
      if (file.tagset[i].Key === tag) {
        return true;
      }
    }
  }

  async switchDisplayMode() {
    this.playlist_mode = !this.playlist_mode;
    localStorage.setItem(
      'mode_' + this.projects.current_project.id,
      this.playlist_mode ? '1' : '0'
    );
  }

  deleteStems() {
    var num_files = 0;
    this.files.forEach((file: S3File) => {
      if (file.checked) {
        num_files++;
      }
    });

    const title = 'Confirm Delete';
    const message = 'Are you sure you want to delete ' + num_files + ' items ?';
    const btnOkText = 'Ok';
    const btnCancelText = 'Cancel';

    const dialogData = new ConfirmDialogModel(title, message, btnOkText, btnCancelText);

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '480px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe(async (dialogResult: any) => {
      // console.log(dialogResult);
      if (!dialogResult) return;

      this.progress_text = 'Deleting your selection of files...';
      this.progressMaskVisibility = 'visible';

      const url = environment.apiURL + 'deletestem';

      this.files.forEach((file: S3File) => {
        if (file.checked) {
          this.files_to_delete++;
          let delete_data = {key: file.key, project_id: this.projects.current_project.id};
          this.progress_text = 'Deleting ' + file.filename + '...';

          this.http.post<any>(url, delete_data).subscribe({
            next: _ => {
              console.log('Delete successful');
              this.files_deleted++;
              this.progressMaskVisibility = 'hidden';
            },
            error: error => {
              this.progressMaskVisibility = 'hidden';
              console.error(error.message);
            },
          });
        }
      });

      this.filesDeletionID = setInterval(() => this.waitForDeletions(), 50);
    });
  }

  waitForDeletions() {
    if (this.files_deleted >= this.files_to_delete) {
      clearInterval(this.filesDeletionID);
      this.files_deleted = 0;
      this.files_to_delete = 0;
      this.loadStems(this.projects.current_project);
    }
  }

  downloadStems() {
    // console.log('entering downloadStems()');
    let infos: Info[] = this.files
      .filter(file => file.checked)
      .map(file => new Object({path: file.key, filename: file.filename}) as Info);

    this.socket = io(environment.socketURL, {
      transports: ['websocket'],
      auth: {
        token: this.authService.getLoggedInToken(),
      },
      query: {infos: JSON.stringify(infos)},
    });

    // Socket connection notifier
    this.socket.emit('downloadStems', () => {
      // console.log(`Socket connected to ${environment.socketURL}. Socket id = ${this.socket.id}`);
      this.setProgress(
        true,
        'Downloading. This may take a long while depending on your selection.'
      );
    });

    this.socket.on('progress', async (p: any) => {
      // console.log(p);
      // console.log('progress: ' + p.value);
      if (p.value !== undefined) {
        if (p.value >= 0) this.setProgress(true, p.message, p.value);
        else this.setProgress(true, p.message);
      } else {
        if (p.signedurl !== undefined) {
          this.setProgress(false, '');
          if (!this.authService.is_tauri_running) {
            window.location.assign(environment.apiURL + p.signedurl);
          } else {
            // console.log('in tauri download...');
            let url = environment.apiURL + p.signedurl;
            this.setProgress(
              true,
              `Downloading ${this.projects.current_project.name}.zip. The file will be on your desktop.`
            );
            const ret = await invoke('download', {
              url: url,
              path: `${this.projects.current_project.name}.zip`,
              token: this.authService.getLoggedInToken(),
            });
            // console.log('Tauri returns: ', ret);
            this.setProgress(false, '');
          }
        } else if (p.errorMsg !== undefined) {
          this.setProgress(false, p.errorMsg);
          const snackbarRef = this.snackBar.open(p.errorMsg, 'Close', {
            duration: 10000,
          });
          snackbarRef.onAction().subscribe(_ => snackbarRef.dismiss());
        }
        this.socket.disconnect();
      }
    });
  }

  // setProgress can be called from projects (or other services)
  // for showing progress notifications.
  async setProgress(visible: boolean, progresstext: string, progressvalue?: number) {
    // console.log("setProgress in Main: ", visible, " - ", progresstext);
    this.progressMaskVisibility = visible ? 'visible' : 'hidden';
    this.progress_text = progresstext;
    if (progressvalue !== undefined) {
      this.progress_mode = this.progress_determinate;
      this.progress_value = progressvalue;
    } else {
      this.progress_mode = this.progress_indeterminate;
    }
  }

  async refreshView(project_id: number) {
    this.projects.getProjects();
    document.getElementById('project_' + project_id)?.click();
  }

  addUserName(user: any) {
    const formattedUsername =
      user.username === '' ? this.users.userName(user.email) : user.username;

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

        this.http.put<any>(url, {newUsername: newUsername}).subscribe({
          next: _ => {
            const content = 'Username Updated Successfully';
            const action = 'Close';
            const snackbarRef = this.snackBar.open(content, action, {
              duration: 2000,
              panelClass: ['success'],
            });
            snackbarRef.onAction().subscribe(_ => snackbarRef.dismiss());
          },
          error: _ => {
            user.username = username;
            const content = 'Failed to change username! Please try again after some time.';
            const action = 'Close';
            const snackbarRef = this.snackBar.open(content, action, {
              panelClass: ['error'],
            });
            snackbarRef.onAction().subscribe(_ => snackbarRef.dismiss());
          },
        });
      }
    });
  }

  @ViewChild('drawer', {static: true}) drawer!: MatDrawer;
  @ViewChild('activityLogDiv', {static: true}) activityLogDiv!: ElementRef;

  toggleNotification() {
    this.drawer.toggle();
    this.newActivitiesCount = 0;
    this.noMoreActivitiesData = false;
    this.isFilledButton = this.drawer.opened;
    // console.log('clickedToggle');
  }

  trackActivitesById(index: number, activity: any) {
    return activity.id;
  }
  fetchActivities(project_id: number, limit: number, offset?: number) {
    // THIS CODE TAKES UP THE WHOLE BANDWITH AND KEEPS THE AUDIO FROM WORKING RIGHT
    let activities: any[] = [];
    const activitiesSubscription$ = this.http
      .get<any[]>(this.activitiesUrl(project_id, limit, offset))
      .toPromise()
      .then(data => {
        activities = data as any;
        if (Array.isArray(activities)) {
          // display the number of new activities
          this.newActivitiesCount = activities.length - this.activities.length;
          this.activities = activities;
          this.isActivityLogVisible = true;
          this.loadingActivities = false;
        }
      })
      .catch(err => {
        console.log(err);
      });

    // activitiesSubscription$.unsubscribe();
  }

  async loadMoreActivities() {
    const remainder = 10 - (this.activities.length % 10);
    const arrayLimit = this.activities.length + remainder;
    this.loadingActivities = true;
    this.fetchActivities(this.project_id, arrayLimit, this.offset);
  }

  onScroll(): void {
    const element = this.activityLogDiv.nativeElement;
    if (element.scrollHeight - element.scrollTop - 50 <= element.clientHeight) {
      // user has scrolled to the bottom of the div
      this.loadMoreActivities();
    }
  }

  previewLink() {
    let domain = window.location.hostname;
    if (domain.includes('localhost')) {
      domain = 'http://' + domain;
      domain = domain + ':4200';
    } else {
      domain = 'https://' + domain;
    }
    let activeLink =
      domain +
      '/playlist?id=' +
      this.projects.current_project.playlist_id +
      '&uid=' +
      this.projects.current_project.owner_id;

    window.open(activeLink, '_new');
  }
  getActiveLink() {
    let domain = window.location.hostname;
    if (domain.includes('localhost')) {
      domain = 'http://' + domain;
      domain = domain + ':4200';
    } else {
      domain = 'https://' + domain;
    }
    let activeLink =
      domain +
      '/playlist?id=' +
      this.projects.current_project.playlist_id +
      '&uid=' +
      this.projects.current_project.owner_id;

    navigator['clipboard']
      .writeText(activeLink)
      .then()
      .catch(e => console.error(e));
    alert(
      "Your Playlist link is on your computer's clipboard. Paste in and email or anything...\n\n" +
        activeLink
    );
  }
  getEmbedCode() {
    let domain = window.location.hostname;
    if (domain.includes('localhost')) {
      domain = 'http://' + domain;
      domain = domain + ':4200';
    } else {
      domain = 'https://' + domain;
    }
    let activeLink =
      domain +
      '/playlist?id=' +
      this.projects.current_project.playlist_id +
      '&uid=' +
      this.projects.current_project.owner_id;
    let embed_code =
      "<iframe src='" + activeLink + "' border='0' width='860px' height='680px'></iframe>";
    navigator['clipboard']
      .writeText(embed_code)
      .then()
      .catch(e => console.error(e));
    alert(
      "Your Playlist Embed Code is on your computer's clipboard. Paste it in a web page.\n\n" +
        embed_code
    );
  }

  editTags() {
    const editableFiles = this.selectedFiles;
    const suggestedTags = this.projects.current_project.playlist_data.contents.flatMap(
      (item: {tagset: any[]}) => item.tagset.map(tag => tag.Key)
    );

    const modalData = {
      suggestedTags,
      editableFiles,
    };

    const dialogRef = this.dialog.open(FileEditModalComponent, {
      width: '480px',
      data: modalData,
    });

    dialogRef.afterClosed().subscribe(result => {
      let formattedFiles: any = [];

      editableFiles.forEach((file: {filename: string}) => {
        const filename = file.filename;
        formattedFiles.push({filename});
      });

      const tags = result.tags
        .filter((item: string) => item !== 'Example Tag')
        .map((item: string) => ({
          Key: item,
          Value: '',
        }));

      const manipulatedData = {
        projectId: this.projects.current_project.id,
        files: formattedFiles,
        TagSet: tags,
      };

      this.http.post(`${environment.apiURL}update-file-tags`, manipulatedData).subscribe({
        next: _ => {
          this.loadStems();
        },
        error: error => {
          console.error(error);
        },
      });
    });
  }

  isAllFilesSelected(tag: string) {
    const filteredFiles = this.files.filter(file => this.checkForTag(file, tag));
    const selectedFiles = filteredFiles.filter(file => file.checked);
    return filteredFiles.length > 0 && selectedFiles.length === filteredFiles.length;
  }

  isIndeterminate(tag: string) {
    const filteredFiles = this.files.filter(file => this.checkForTag(file, tag));
    const selectedFiles = filteredFiles.filter(file => file.checked);
    return selectedFiles.length > 0 && selectedFiles.length < filteredFiles.length;
  }

  selectAllFilesWithTag(tag: string) {
    const filteredFiles = this.files.filter(file => this.checkForTag(file, tag));
    const selectedFiles = filteredFiles.filter(file => file.checked);
    const isSelectedAll = selectedFiles.length === filteredFiles.length;

    for (const file of filteredFiles) {
      if (isSelectedAll) {
        file.checked = false;
        file.backcolor = '#ffffff0d';
        file.border = '1px solid #323232';
        file.checkmark = 'hidden';
        const index = this.selectedFiles.findIndex(selectedFile => selectedFile.key === file.key);
        if (index !== -1) {
          this.selectedFiles.splice(index, 1);
        }
      } else {
        file.checked = true;
        file.backcolor = this.lightBlue;
        file.border = `1px solid ${this.primaryBlue}`;
        file.checkmark = 'visible';
        this.selectedFiles.push(file);
      }
    }
  }

  infoButtonClick(event: any, file: S3File) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(FileRenameComponent, {
      width: '480px',
      data: file,
    });

    dialogRef.afterClosed().subscribe(result => {
      const projectId = this.projects.current_project.id;
      const fileKey = file.key;
      const body = {
        projectId: projectId,
        file: {
          fileKey: fileKey,
          newFilename: result.fileName,
        },
        metaData: {
          note: result.fileNote,
        },
      };

      this.http.post(`${environment.apiURL}update-file-info`, body).subscribe({
        next: _ => {
          this.loadStems();
        },
        error: error => {
          console.error(error);
        },
      });
    });
  }

  // END OF COMPONENT CLASS //
}
