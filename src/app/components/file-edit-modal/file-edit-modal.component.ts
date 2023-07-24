import {Component, ElementRef, ViewChild, OnInit, Inject} from '@angular/core';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {FormControl} from '@angular/forms';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {NgForm} from '@angular/forms';
import {
  MatLegacyDialogRef as MatDialogRef,
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/legacy-dialog';
import {MatLegacyChipInputEvent} from '@angular/material/legacy-chips';

@Component({
  selector: 'app-file-edit-modal',
  templateUrl: './file-edit-modal.component.html',
  styleUrls: ['./file-edit-modal.component.scss'],
})
export class FileEditModalComponent implements OnInit {
  files!: any[];
  note: string = ' ';
  maxTagsLength: number = 10;

  separatorKeysCodes: number[] = [ENTER, COMMA];
  tagCtrl = new FormControl('');
  filteredTags: Observable<string[]>;

  // For Mat Dialog autofocus issue
  // When the Mat Dialog opens, it automatically focuses on the first input field.
  // To prevent this, set a default value for the input field.
  tags: string[] = ['Example Tag'];
  
  allTags: string[] = [];

  @ViewChild('tagInput') tagInput!: ElementRef<HTMLInputElement>;

  constructor(
    public dialogRef: MatDialogRef<FileEditModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.files = data.editableFiles;
    this.allTags = Array.from(new Set(data.suggestedTags));

    const filesTags = this.files.flatMap(item => item.tagset.map(tag => tag.Key));

    if (filesTags.length > 0) {
      this.tags = [...new Set(filesTags)];
    }

    this.filteredTags = this.tagCtrl.valueChanges.pipe(
      startWith(null),
      map((tag: string | null) => (tag ? this._filter(tag) : this.allTags.slice()))
    );
  }

  add(event: MatLegacyChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.tags.push(value);
      this.tags = [...new Set(this.tags)];
    }
    event.chipInput!.clear();
    this.tagCtrl.setValue(null);
  }

  remove(tag: string): void {
    const index = this.tags.indexOf(tag);

    if (index >= 0) {
      this.tags.splice(index, 1);
      this.tags = [...new Set(this.tags)];
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    const selectedTag = event.option.viewValue;
    const filteredTags = this.tags.filter(tag => tag !== 'Example Tag');
    if (filteredTags.length < this.maxTagsLength && !filteredTags.includes(selectedTag)) {
      filteredTags.push(selectedTag);
    }
    this.tags = filteredTags;
    this.tagInput.nativeElement.value = '';
    this.tagCtrl.setValue(null);
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.allTags.filter(tag => tag.toLowerCase().includes(filterValue));
  }

  decline() {
    this.dialogRef.close(false);
  }

  onClickSubmit(filesNote: NgForm) {
    this.dialogRef.close({tags: this.tags});
    filesNote.reset();
  }

  ngOnInit(): void {
    this.tags = [...new Set(this.tags)];
  }
}
