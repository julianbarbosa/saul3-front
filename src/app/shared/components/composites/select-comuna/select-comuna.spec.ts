import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectComuna } from './select-comuna';

describe('SelectComuna', () => {
  let component: SelectComuna;
  let fixture: ComponentFixture<SelectComuna>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectComuna],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectComuna);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
