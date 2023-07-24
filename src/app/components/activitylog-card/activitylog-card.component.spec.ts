import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivitylogCardComponent } from './activitylog-card.component';

describe('ActivitylogCardComponent', () => {
  let component: ActivitylogCardComponent;
  let fixture: ComponentFixture<ActivitylogCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivitylogCardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivitylogCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
