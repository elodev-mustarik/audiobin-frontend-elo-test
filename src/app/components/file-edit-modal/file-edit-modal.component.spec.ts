import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileEditModalComponent } from './file-edit-modal.component';

describe('FileEditModalComponent', () => {
  let component: FileEditModalComponent;
  let fixture: ComponentFixture<FileEditModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FileEditModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileEditModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
