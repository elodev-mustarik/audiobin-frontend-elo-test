import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditableUsernameModalComponent } from './editable-username-modal.component';

describe('EditableUsernameModalComponent', () => {
  let component: EditableUsernameModalComponent;
  let fixture: ComponentFixture<EditableUsernameModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditableUsernameModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditableUsernameModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
