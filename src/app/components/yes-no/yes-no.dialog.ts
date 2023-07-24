import {Component, Inject, OnInit} from '@angular/core';
import {MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';

@Component({
  selector: 'yes-no-dialog',
  // template: "{{data}}",
  templateUrl: 'yes-no.dialog.html',
  styleUrls: ['./yes-no.dialog.scss'],
})
export class ConfirmDialogComponent implements OnInit {
  title!: string;
  message!: string;
  btnOkText!: string;
  btnCancelText!: string;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogModel
  ) {
    // Update view with given values
    this.title = data.title;
    this.message = data.message;
    this.btnOkText = data.btnOkText;
    this.btnCancelText = data.btnCancelText;
  }

  ngOnInit(): void {}

  confirm() {
    // Close the dialog, return true
    this.dialogRef.close(true);
  }

  decline() {
    // Close the dialog, return false
    this.dialogRef.close(false);
  }
}

/**
 * Class to represent confirm dialog model.
 *
 * It has been kept here to keep it as part of shared component.
 */
export class ConfirmDialogModel {
  constructor(
    public title: string,
    public message: string,
    public btnOkText: string,
    public btnCancelText: string
  ) {}
}
