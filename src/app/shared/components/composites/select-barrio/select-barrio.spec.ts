import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectBarrio } from './select-barrio';

describe('SelectBarrio', () => {
  let component: SelectBarrio;
  let fixture: ComponentFixture<SelectBarrio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectBarrio],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectBarrio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
