import {Component, OnInit, Inject} from '@angular/core';
import {MatLegacyDialogRef as MatDialogRef, MatLegacyDialogConfig as MatDialogConfig, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';
import {Router} from '@angular/router';
import {ProjectsService} from '../../services/project/projects.service';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';

export interface DialogData {
  project_name: string;
  project_bpm: number;
  project_sig: string;
  owner_id: number;
  downloadable?: boolean;
  project_description?: string;
}

@Component({
  selector: 'new-project-dialog',
  template: '{{data}}',
  templateUrl: 'new-project.component.html',
  styleUrls: ['./new-project.component.scss'],
})
export class NewProjectDialog {
  constructor(
    public dialogRef: MatDialogRef<NewProjectDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public router: Router,
    private prjService: ProjectsService,
    private snackBar: MatSnackBar
  ) {}
  ngOnInit() {
    console.log('owner_id: ' + this.data.owner_id);
    this.owner_id = this.data.owner_id;
  }

  inputName: string = '';
  inputSig: string = '4/4';
  inputBpm: number = 120;
  owner_id: number = 0;

  isDownloadable: boolean = true;
  projectNote: string = '';

  params!: {params: DialogData};

  async onCheckboxChange(event: any) {
    this.isDownloadable = event.target.checked;

    const message = this.isDownloadable
      ? 'Download option is enabled'
      : 'Download option is disabled';
    this.snackBar.open(message, 'Close', {duration: 3000, panelClass: ['success']});
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  async createProject(): Promise<void> {
    this.params = {
      params: {
        project_name: this.inputName,
        project_bpm: this.inputBpm,
        project_sig: this.inputSig,
        owner_id: this.owner_id,
        downloadable: this.isDownloadable,
        project_description: this.projectNote,
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
    const createdProject = await this.prjService.createNewProject(this.params);
    if (createdProject) {
      this.dialogRef.close(createdProject);
    }
  }
}
