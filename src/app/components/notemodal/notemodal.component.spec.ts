import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotemodalComponent } from './notemodal.component';

describe('NotemodalComponent', () => {
  let component: NotemodalComponent;
  let fixture: ComponentFixture<NotemodalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NotemodalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotemodalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
