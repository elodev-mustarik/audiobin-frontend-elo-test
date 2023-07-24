import {Component, Inject, Input} from '@angular/core';
import {MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';
import {Router} from '@angular/router';
import {ProjectsService} from '../../services/project/projects.service';
import {ConfirmDialogComponent, ConfirmDialogModel} from '../yes-no/yes-no.dialog';
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';
import {SkyDialog} from '../login-skytracks/login-skytracks.component';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';

export interface DialogData {
  project_id: number;
  project_name: string;
  project_bpm: number;
  project_sig: string;
  user_id: number;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  downloadable?: boolean;
  project_description?: string;
  playlist_id?: string;
  files: any[];
}

@Component({
  selector: 'ProjectSettings',
  template: '{{data}}',
  templateUrl: 'project-settings.component.html',
  styleUrls: ['./project-settings.component.scss'],
})
export class ProjectSettingsDialog {
  isDownloadable = false;
  project_description: string = '';
  playlist_id: string = '';

  constructor(
    public dialogRef: MatDialogRef<ProjectSettingsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public router: Router,
    private projects: ProjectsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // console.log({data: this.data});
    console.log('project_id: ' + this.data.project_id);
    this.project_id = this.data.project_id;
    this.inputName = this.data.project_name;
    this.inputBpm = this.data.project_bpm;
    this.inputSig = this.data.project_sig;
    this.user_id = this.data.user_id;
    this.owner_id = this.data.owner_id;
    this.owner_name = this.data.owner_name;
    this.isDownloadable = this.data.isDownloadable;
    this.playlist_id = this.data.playlist_id;
    this.project_description = this.data.project_description;
    this.playlist_id = this.data.playlist_id;
    this.owner_email = this.data.owner_email;
  }

  async onCheckboxChange(event: any) {
    this.isDownloadable = event.target.checked;
    const message = this.isDownloadable
      ? 'Download option is enabled'
      : 'Download option is disabled';
    this.snackBar.open(message, 'Close', {duration: 3000, panelClass: ['success']});
  }

  project_id: number = 0;
  inputName: string = '';
  inputSig: string = '4/4';
  inputBpm: number = 120;
  user_id: number = 0;
  owner_id: number = 0;
  owner_name = '';
  owner_email = '';

  params!: {params: DialogData};

  onNoClick(): void {
    this.dialogRef.close();
  }

  async saveProject(): Promise<void> {
    this.params = {
      params: {
        project_id: this.project_id,
        project_name: this.inputName,
        project_bpm: this.inputBpm,
        project_sig: this.inputSig,
        user_id: this.user_id,
        owner_id: this.owner_id,
        owner_name: this.owner_name,
        owner_email: this.owner_email,
        downloadable: this.isDownloadable,
        project_description: this.project_description,
        playlist_id: this.playlist_id,
        files: this.data.files,
      },
    };
    console.log(this.params);

    if (this.inputName === '') {
      alert('Please enter a project name');
      return;
    }
    var sig_test = /^([0-9]\/[0-9])$/;
    if (!sig_test.test(this.inputSig)) {
      alert('Please enter a valid signature');
      return;
    }
    await this.projects.updateProject(this.params).then(async (data: any) => {
      this.dialogRef.close(3);
    });
  }

  async deleteProject(): Promise<void> {
    //  delete record in database with relation to user, and keep folder in S3.
    //  will deal with deleted folders later.
    //  if project is recreated, files are restored from "saved/undeleted" folder.

    const title = 'Confirm Delete';
    const message = 'Are you sure you want to delete ' + this.inputName + ' ?';
    const btnOkText = 'Ok';
    const btnCancelText = 'Cancel';

    const dialogData = new ConfirmDialogModel(title, message, btnOkText, btnCancelText);

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '85vw',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe(async (dialogResult: any) => {
      console.log(dialogResult);
      if (!dialogResult) return;
      console.log('deleting ' + this.inputName);
      var delete_success = await this.projects.deleteProject(this.project_id);
      // close dialog and refresh parent ???
      this.dialogRef.close(2);
    });
  }

  doAlert(msg: string) {
    alert(msg);
  }

  async sendToSkytracks() {
    this.dialogRef.close();
    const dialogSky = this.dialog.open(SkyDialog, {
      maxWidth: '400px',
      data: this.data,
    });

    dialogSky.afterClosed().subscribe(async (dialogResult: any) => {});

    // do something
    return;
  }
}
