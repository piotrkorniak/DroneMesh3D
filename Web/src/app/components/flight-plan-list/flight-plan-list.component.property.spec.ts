import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import * as fc from 'fast-check';
import { FlightPlanListComponent } from './flight-plan-list.component';
import { FlightPlansApiService } from '../../api/services/flight-plans.service';
import { SelectionStateService } from '../../services/selection-state.service';
import { LiveAnnouncerService } from '../../services/live-announcer.service';
import { FlightPlanResponse } from '../../api/models/flight-plan-response';
import { formatFlightTime } from '../../utils/format-flight-time';

/**
 * Feature: ux-area-management-redesign, Property 7: Flight plan item displays all required fields
 * Feature: ux-area-management-redesign, Property 10: Aria-live announces plan count on change
 *
 * Validates: Requirements 5.7, 8.5
 */
describe('FlightPlanListComponent - Property Tests', () => {
  let component: FlightPlanListComponent;
  let fixture: ComponentFixture<FlightPlanListComponent>;
  let flightPlansApiSpy: jasmine.SpyObj<FlightPlansApiService>;
  let selectionState: SelectionStateService;
  let liveAnnouncerSpy: jasmine.SpyObj<LiveAnnouncerService>;

  /**
   * Generates a valid FlightPlanResponse with a unique id based on index.
   */
  function buildPlan(index: number, mode: string): FlightPlanResponse {
    return {
      id: `plan-${index}`,
      areaId: 'area-1',
      mode,
      waypoints: [
        { latitude: 50.0, longitude: 20.0, altitudeAglM: 100, gimbalPitchDegrees: -90, gimbalYawDegrees: 0 },
      ],
      statistics: { totalDistanceM: 1000, estimatedFlightTimeS: 120, photoCount: 30, coveredAreaM2: 5000 },
      createdAt: new Date(2024, 0, 16, 12, 0, 0).toISOString(),
    };
  }

  /**
   * Arbitrary: generates a list size (1–20) and a delete index within that list.
   */
  const planListParamsArb = fc
    .integer({ min: 1, max: 20 })
    .chain((listSize) =>
      fc.tuple(
        fc.constant(listSize),
        fc.integer({ min: 0, max: listSize - 1 }),
        fc.array(fc.constantFrom('Grid', 'Poi'), { minLength: listSize, maxLength: listSize })
      )
    );

  beforeEach(async () => {
    flightPlansApiSpy = jasmine.createSpyObj('FlightPlansApiService', ['list', 'exportMissionFile', 'deleteFlightPlan']);
    flightPlansApiSpy.list.and.returnValue(of([]));
    flightPlansApiSpy.deleteFlightPlan.and.returnValue(of(void 0));

    liveAnnouncerSpy = jasmine.createSpyObj('LiveAnnouncerService', ['announce']);

    await TestBed.configureTestingModule({
      imports: [FlightPlanListComponent],
      providers: [
        { provide: FlightPlansApiService, useValue: flightPlansApiSpy },
        { provide: LiveAnnouncerService, useValue: liveAnnouncerSpy },
      ],
    }).compileComponents();

    selectionState = TestBed.inject(SelectionStateService);
    fixture = TestBed.createComponent(FlightPlanListComponent);
    component = fixture.componentInstance;
  });

  describe('Property 10: Aria-live announces plan count on change', () => {
    it('should announce remaining plan count after deletion for any list size', () => {
      let iteration = 0;

      const property = fc.property(
        planListParamsArb,
        ([listSize, deleteIndex, modes]) => {
          iteration++;

          // Build plans list
          const plans: FlightPlanResponse[] = Array.from(
            { length: listSize },
            (_, i) => buildPlan(i, modes[i])
          );

          // Reset spy state
          liveAnnouncerSpy.announce.calls.reset();

          // Configure list mock to return the generated plans
          flightPlansApiSpy.list.and.returnValue(of(plans));
          flightPlansApiSpy.deleteFlightPlan.and.returnValue(of(void 0));

          // Trigger area selection which loads the plans via the component's effect
          // Use unique area IDs to re-trigger the effect on each iteration
          selectionState.selectArea(`area-${iteration}`);
          fixture.detectChanges();

          // Verify plans were loaded correctly
          if (component.plans().length !== listSize) {
            return false;
          }

          // Trigger deletion of the plan at deleteIndex
          const planToDelete = plans[deleteIndex];
          component.deleteTargetPlan.set(planToDelete);
          component.onDeleteConfirm();
          fixture.detectChanges();

          // The expected remaining count after deletion
          const expectedRemaining = listSize - 1;

          // Verify LiveAnnouncerService.announce was called
          if (!liveAnnouncerSpy.announce.calls.count()) {
            return false;
          }

          // Verify the announcement message contains the correct remaining count
          const announcedMessage = liveAnnouncerSpy.announce.calls.mostRecent().args[0] as string;
          if (!announcedMessage.includes(`${expectedRemaining}`)) {
            return false;
          }

          // Verify the announcement includes the "Pozostało planów:" prefix
          if (!announcedMessage.includes('Pozostało planów:')) {
            return false;
          }

          return true;
        }
      );

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });

  /**
   * Feature: ux-area-management-redesign, Property 7: Flight plan item displays all required fields
   *
   * Validates: Requirements 5.7
   */
  describe('Property 7: Flight plan item displays all required fields', () => {
    it('should display mode label, createdAt, distance (integer meters), flight time ("X min Y s"), and photo count for any valid FlightPlanResponse', () => {
      const flightPlanArb: fc.Arbitrary<FlightPlanResponse> = fc.record({
        id: fc.uuid(),
        areaId: fc.uuid(),
        mode: fc.constantFrom('Grid' as const, 'Poi' as const),
        waypoints: fc.array(
          fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true }),
            altitudeAglM: fc.double({ min: 10, max: 500, noNaN: true }),
            gimbalPitchDegrees: fc.double({ min: -90, max: 0, noNaN: true }),
            gimbalYawDegrees: fc.double({ min: 0, max: 360, noNaN: true }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        statistics: fc.record({
          totalDistanceM: fc.double({ min: 0, max: 100000, noNaN: true }),
          estimatedFlightTimeS: fc.integer({ min: 0, max: 36000 }),
          photoCount: fc.integer({ min: 0, max: 10000 }),
          coveredAreaM2: fc.double({ min: 0, max: 1000000, noNaN: true }),
        }),
        createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
      });

      let iteration = 0;

      const property = fc.property(
        flightPlanArb,
        (plan: FlightPlanResponse) => {
          iteration++;

          // Set up the component with this plan — alternate area IDs to re-trigger the effect
          flightPlansApiSpy.list.and.returnValue(of([plan]));
          const areaId = `area-${iteration}`;
          selectionState.selectArea(areaId);
          fixture.detectChanges();

          const nativeEl: HTMLElement = fixture.nativeElement;
          const textContent = nativeEl.textContent || '';

          // 1. Mode label: "Grid" or "POI"
          const expectedModeLabel = plan.mode === 'Grid' ? 'Grid' : 'POI';
          if (!textContent.includes(expectedModeLabel)) {
            return false;
          }

          // 2. createdAt: the relative time pipe produces some text output — verify date element exists and has content
          const dateEl = nativeEl.querySelector('.flight-plan-list__date');
          if (!dateEl || !dateEl.textContent || dateEl.textContent.trim().length === 0) {
            return false;
          }

          // 3. Distance: Math.round(totalDistanceM) + " m"
          const expectedDistance = `${Math.round(plan.statistics.totalDistanceM)} m`;
          if (!textContent.includes(expectedDistance)) {
            return false;
          }

          // 4. Flight time: "X min Y s"
          const expectedFlightTime = formatFlightTime(plan.statistics.estimatedFlightTimeS);
          if (!textContent.includes(expectedFlightTime)) {
            return false;
          }

          // 5. Photo count: photoCount + " zdjęć"
          const expectedPhotoCount = `${plan.statistics.photoCount} zdjęć`;
          if (!textContent.includes(expectedPhotoCount)) {
            return false;
          }

          return true;
        }
      );

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });
});
