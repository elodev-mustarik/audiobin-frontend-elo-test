import {Component, Inject, OnInit} from '@angular/core';
import {
  MatLegacyDialogRef as MatDialogRef,
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/legacy-dialog';
import {NgForm} from '@angular/forms';

@Component({
  selector: 'app-file-rename',
  templateUrl: './file-rename.component.html',
  styleUrls: ['./file-rename.component.scss'],
})
export class FileRenameComponent implements OnInit {
  fileName!: string;
  fileNote!: string;
  newFileName: string = '';
  newFileNote: string = '';
  isChanged: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<FileRenameComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.fileName = data.filename;
    this.fileNote = data.fileNote;
  }

  ngOnInit(): void {}

  decline() {
    this.dialogRef.close(false);
  }

  onClickSubmit(fileRenameForm: NgForm) {
    this.newFileName = this.fileName;
    this.newFileNote = this.fileNote;
    this.dialogRef.close({fileName: this.newFileName, fileNote: this.fileNote});
    fileRenameForm.reset();
  }
}
