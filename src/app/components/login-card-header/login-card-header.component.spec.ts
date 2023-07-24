import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginCardHeaderComponent } from './login-card-header.component';

describe('LoginCardHeaderComponent', () => {
  let component: LoginCardHeaderComponent;
  let fixture: ComponentFixture<LoginCardHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LoginCardHeaderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginCardHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
