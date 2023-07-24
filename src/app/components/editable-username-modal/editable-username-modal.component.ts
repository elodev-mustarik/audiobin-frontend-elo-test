import {Component, Inject, OnInit} from '@angular/core';
import {MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';
import {NgForm} from '@angular/forms';

@Component({
  selector: 'app-editable-username-modal',
  templateUrl: './editable-username-modal.component.html',
  styleUrls: ['./editable-username-modal.component.scss'],
  template: '{{data}}',
})
export class EditableUsernameModalComponent implements OnInit {
  title!: string;
  username!: string;
  message!: string;
  btnOkText!: string;
  btnCancelText!: string;

  newUsername: string = '';

  constructor(
    public dialogRef: MatDialogRef<EditableUsernameModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmEditUserModel
  ) {
    // Update view with given values
    this.title = data.title;
    this.username = data.username;
    this.message = data.message;
    this.btnOkText = data.btnOkText;
    this.btnCancelText = data.btnCancelText;
  }

  ngOnInit(): void {}

  decline() {
    // Close the dialog, return false
    this.dialogRef.close(false);
  }

  onClickSubmit(usernameForm: NgForm) {
    this.newUsername = this.username;
    this.dialogRef.close(this.newUsername);
    usernameForm.reset();
  }
}

/**
 * Class to represent confirm dialog model.
 *
 * It has been kept here to keep it as part of shared component.
 */
export class ConfirmEditUserModel {
  constructor(
    public title: string,
    public username: string,
    public message: string,
    public btnOkText: string,
    public btnCancelText: string
  ) {}
}
