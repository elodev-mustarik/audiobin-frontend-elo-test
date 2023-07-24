import {Component, OnInit, Inject, Input} from '@angular/core';
import {MatLegacyDialogRef as MatDialogRef, MatLegacyDialogConfig as MatDialogConfig, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';
import {Router} from '@angular/router';
import {ProjectsService} from '../../services/project/projects.service';
// import {MainComponent} from '../../pages/main/main.component';

// import { FormsModule } from "@angular/forms";
// import { NgForm } from '@angular/forms';

export interface DialogData {
  project_id: number;
  project_name: string;
  project_bpm: number;
  project_sig: string;
  user_id: number;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  files: any[];
}

@Component({
  selector: 'login-skytracks-dialog',
  template: '{{data}}',
  templateUrl: 'login-skytracks.component.html',
  styleUrls: ['./login-skytracks.component.scss'],
})
export class SkyDialog {
  constructor(
    public dialogRef: MatDialogRef<SkyDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public router: Router,
    private prjService: ProjectsService
  ) {}
  ngOnInit() {
    console.log('owner_id: ' + this.data.owner_id);
    this.owner_id = this.data.owner_id;
    this.inputName = this.data.project_name;
    this.inputBpm = this.data.project_bpm;
    this.inputSig = this.data.project_sig;
    this.inputEmail = this.data.owner_email;
  }
  inputName: string = '';
  inputSig: string = '4/4';
  inputBpm: number = 120;
  owner_id: number = 0;
  inputEmail: string = '';
  inputPw: string = '';

  params!: {params: DialogData; pw: string};

  onNoClick(): void {
    this.dialogRef.close();
  }

  async sendProject(): Promise<void> {
    this.params = {params: this.data, pw: this.inputPw};
    const sentProject = await this.prjService.sendSkytracks(this.params);
    if (sentProject) {
      this.dialogRef.close();
    }
  }
}
