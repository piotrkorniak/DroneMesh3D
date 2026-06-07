import * as fc from 'fast-check';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AreaListComponent } from './area-list.component';
import { AreasApiService } from '../../api/services/areas.service';
import { FlightPlansApiService } from '../../api/services/flight-plans.service';
import { SelectionStateService } from '../../services/selection-state.service';
import { LiveAnnouncerService } from '../../services/live-announcer.service';
import { AreaResponse } from '../../api/models/area-response';
import { FlightPlanResponse } from '../../api/models/flight-plan-response';

/**
 * Feature: ux-area-management-redesign, Property 2: Deletion clears selection state
 *
 * Validates: Requirements 3.5
 */
describe('AreaListComponent - Property Tests', () => {
  let component: AreaListComponent;
  let selectionState: SelectionStateService;
  let areasApiSpy: jasmine.SpyObj<AreasApiService>;
  let flightPlansApiSpy: jasmine.SpyObj<FlightPlansApiService>;
  let liveAnnouncerSpy: jasmine.SpyObj<LiveAnnouncerService>;

  beforeEach(() => {
    areasApiSpy = jasmine.createSpyObj('AreasApiService', ['listAreas', 'deleteArea']);
    flightPlansApiSpy = jasmine.createSpyObj('FlightPlansApiService', ['list']);
    liveAnnouncerSpy = jasmine.createSpyObj('LiveAnnouncerService', ['announce']);

    areasApiSpy.listAreas.and.returnValue(of([]));
    areasApiSpy.deleteArea.and.returnValue(of(void 0));
    flightPlansApiSpy.list.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [AreaListComponent],
      providers: [
        { provide: AreasApiService, useValue: areasApiSpy },
        { provide: FlightPlansApiService, useValue: flightPlansApiSpy },
        { provide: LiveAnnouncerService, useValue: liveAnnouncerSpy },
      ],
    });

    selectionState = TestBed.inject(SelectionStateService);
    const fixture = TestBed.createComponent(AreaListComponent);
    component = fixture.componentInstance;
  });

  describe('Property 2: Deletion clears selection state', () => {
    it('after successful deletion of the selected area, selectedAreaId is null and plans list is empty', () => {
      const property = fc.property(
        fc.uuid(),
        (areaId: string) => {
          // Setup: create an area with the generated ID
          const area: AreaResponse = {
            id: areaId,
            createdAt: '2024-01-01T00:00:00Z',
            geometry: {
              type: 'Polygon',
              coordinates: [[[20.0, 50.0], [20.1, 50.0], [20.1, 50.1], [20.0, 50.1], [20.0, 50.0]]],
            },
          };

          // Populate areas in selection state
          selectionState.areas.set([area]);

          // Set some plans (simulating previously loaded plans for this area)
          const mockPlans: FlightPlanResponse[] = [
            {
              id: 'plan-1',
              areaId: areaId,
              mode: 'grid',
              waypoints: [],
              statistics: { totalDistance: 100, flightTime: 60, photoCount: 10 } as unknown as FlightPlanResponse['statistics'],
              createdAt: '2024-01-01T00:00:00Z',
            },
          ];
          selectionState.plans.set(mockPlans);

          // Select this area
          selectionState.selectArea(areaId);

          // Verify precondition: area is selected and plans are populated
          if (selectionState.selectedAreaId() !== areaId) {
            return false;
          }
          if (selectionState.plans().length === 0) {
            return false;
          }

          // Simulate delete: set target area and call onDeleteConfirmed
          areasApiSpy.deleteArea.and.returnValue(of(void 0));
          component.deleteTargetArea.set(area);
          component.onDeleteConfirmed();

          // Verify: selectedAreaId should be null
          if (selectionState.selectedAreaId() !== null) {
            return false;
          }

          // Verify: plans list should be empty
          if (selectionState.plans().length !== 0) {
            return false;
          }

          return true;
        }
      );

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });
});
