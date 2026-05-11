import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArenaCore } from './arena-core';

describe('ArenaCore', () => {
  let component: ArenaCore;
  let fixture: ComponentFixture<ArenaCore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArenaCore],
    }).compileComponents();

    fixture = TestBed.createComponent(ArenaCore);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
