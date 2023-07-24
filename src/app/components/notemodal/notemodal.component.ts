import {Component, OnInit, Input, Inject} from '@angular/core';
import {NgForm} from '@angular/forms';
import {
  MatLegacyDialogRef as MatDialogRef,
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/legacy-dialog';

@Component({
  selector: 'app-notemodal',
  templateUrl: './notemodal.component.html',
  styleUrls: ['./notemodal.component.scss'],
})
export class NotemodalComponent implements OnInit {
  @Input() files!: any[];
  note: string = ' ';

  constructor(
    public dialogRef: MatDialogRef<NotemodalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.files = data;
  }

  decline() {
    this.dialogRef.close(false);
  }

  onClickSubmit(filesNote: NgForm) {
    this.dialogRef.close(this.note);
    filesNote.reset();
  }

  ngOnInit(): void {}
}
