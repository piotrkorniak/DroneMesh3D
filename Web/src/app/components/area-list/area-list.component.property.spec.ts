import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { of } from 'rxjs';
import { AreaListComponent } from './area-list.component';
import { AreasApiService } from '../../api/services/areas.service';
import { FlightPlansApiService } from '../../api/services/flight-plans.service';
import { LiveAnnouncerService } from '../../services/live-announcer.service';

/**
 * Feature: ux-area-management-redesign, Property 3: Confirmation dialog shows cascade plan count
 *
 * Validates: Requirements 3.6
 */
describe('AreaListComponent - Property Tests', () => {
  let component: AreaListComponent;

  beforeEach(() => {
    const areasApiSpy = jasmine.createSpyObj('AreasApiService', ['listAreas', 'deleteArea']);
    const flightPlansApiSpy = jasmine.createSpyObj('FlightPlansApiService', ['list']);
    const liveAnnouncerSpy = jasmine.createSpyObj('LiveAnnouncerService', ['announce']);
    areasApiSpy.listAreas.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [AreaListComponent],
      providers: [
        { provide: AreasApiService, useValue: areasApiSpy },
        { provide: FlightPlansApiService, useValue: flightPlansApiSpy },
        { provide: LiveAnnouncerService, useValue: liveAnnouncerSpy },
      ],
    });

    const fixture = TestBed.createComponent(AreaListComponent);
    component = fixture.componentInstance;
  });

  describe('Property 3: Confirmation dialog shows cascade plan count', () => {
    it('should contain the plan count number in the dialog message when plans > 0', () => {
      const property = fc.property(
        fc.integer({ min: 1, max: 50 }),
        (planCount: number) => {
          component.deletePlanCount.set(planCount);

          const message = component.deleteDialogMessage();

          // The message must contain the plan count number
          if (!message.includes(String(planCount))) {
            return false;
          }

          return true;
        }
      );

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });
});
