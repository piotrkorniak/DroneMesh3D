import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MapComponent } from './map.component';
import { MapDrawingService } from '../../services/map-drawing.service';
import { AreaResponse } from '../../api/models/area-response';

/**
 * Integration test: Full flow simulation via MapDrawingService
 * Service.startDrawing() → map adds Draw interaction → draw end → service.setPolygonCoordinates() → service.submitArea() → HTTP 201
 *
 * This test verifies the MapComponent correctly integrates with MapDrawingService.
 */
describe('MapComponent Integration (end-to-end flow via MapDrawingService)', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let httpTesting: HttpTestingController;
  let mapDrawingService: MapDrawingService;

  // Valid polygon coordinates in EPSG:4326 (lon, lat) — a small square in Warsaw
  const validCoords4326: number[][] = [
    [21.0122, 52.2297],
    [21.0132, 52.2297],
    [21.0132, 52.2287],
    [21.0122, 52.2287],
    [21.0122, 52.2297], // closed ring
  ];

  // Same coordinates in EPSG:3857 (Web Mercator) are used internally by OpenLayers
  // when the map renders the polygon from the EPSG:4326 input.

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    mapDrawingService = TestBed.inject(MapDrawingService);

    // Initialize the map (ngOnInit)
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should complete the full flow: startDrawing → setPolygonCoordinates → submitArea → 201 Created', () => {
    // --- Step 1: Start drawing via service ---
    mapDrawingService.startDrawing();
    TestBed.flushEffects();

    // Verify Draw interaction was added
    const interactions = component.getMap().getInteractions().getArray();
    const drawInteraction = interactions.find(i => i.constructor.name === 'Draw');
    expect(drawInteraction).toBeTruthy();

    // --- Step 2: Simulate draw end by setting polygon coordinates via service ---
    mapDrawingService.setPolygonCoordinates(validCoords4326);
    TestBed.flushEffects();

    // Verify service state
    expect(mapDrawingService.hasPolygon()).toBeTrue();
    expect(mapDrawingService.isDrawing()).toBeFalse();
    expect(mapDrawingService.isValid()).toBeTrue();
    expect(mapDrawingService.validationErrors()).toEqual([]);

    // --- Step 3: Submit area via service ---
    expect(mapDrawingService.isSubmitting()).toBeFalse();
    mapDrawingService.submitArea().subscribe();

    // --- Step 4: Verify isSubmitting is true while request is in flight ---
    expect(mapDrawingService.isSubmitting()).toBeTrue();

    // --- Step 5: Mock the HTTP response (201 Created with AreaResponse) ---
    const mockResponse: AreaResponse = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      createdAt: '2026-06-04T10:30:00Z',
      geometry: {
        type: 'Polygon',
        coordinates: [validCoords4326],
      },
    };

    const req = httpTesting.expectOne('/api/areas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.type).toBe('Polygon');
    expect(req.request.body.coordinates).toBeDefined();
    expect(req.request.body.coordinates.length).toBe(1);

    // Coordinates should be in EPSG:4326 (WGS 84)
    const submittedRing = req.request.body.coordinates[0];
    expect(submittedRing.length).toBe(validCoords4326.length);

    req.flush(mockResponse, { status: 201, statusText: 'Created' });

    // --- Step 6: Verify post-submission state ---
    expect(mapDrawingService.isSubmitting()).toBeFalse();
    expect(mapDrawingService.hasPolygon()).toBeFalse();
  });

  it('should handle submission error gracefully', () => {
    // Set polygon coordinates
    mapDrawingService.setPolygonCoordinates(validCoords4326);
    TestBed.flushEffects();

    // Submit
    mapDrawingService.submitArea().subscribe({
      error: () => { /* expected */ },
    });
    expect(mapDrawingService.isSubmitting()).toBeTrue();

    // Mock a 422 error response
    const errorResponse = {
      message: 'Validation failed.',
      errors: ['Polygon area exceeds maximum of 5 hectares.'],
    };

    const req = httpTesting.expectOne('/api/areas');
    req.flush(errorResponse, { status: 422, statusText: 'Unprocessable Entity' });

    // Verify error state
    expect(mapDrawingService.isSubmitting()).toBeFalse();
    // hasPolygon should remain true (polygon preserved on error)
    expect(mapDrawingService.hasPolygon()).toBeTrue();
  });

  it('should add Modify interaction after polygon coordinates are set', () => {
    mapDrawingService.setPolygonCoordinates(validCoords4326);
    TestBed.flushEffects();

    const map = component.getMap();
    const modifyInteractions = map.getInteractions().getArray().filter(
      i => i.constructor.name === 'Modify'
    );
    expect(modifyInteractions.length).toBe(1);
  });

  it('should add Draw interaction when service starts drawing', () => {
    mapDrawingService.startDrawing();
    TestBed.flushEffects();

    const map = component.getMap();
    const drawInteractions = map.getInteractions().getArray().filter(
      i => i.constructor.name === 'Draw'
    );
    expect(drawInteractions.length).toBe(1);
  });

  it('should remove Draw interaction when drawing is cancelled via service', () => {
    mapDrawingService.startDrawing();
    TestBed.flushEffects();

    mapDrawingService.cancelDrawing();
    TestBed.flushEffects();

    const map = component.getMap();
    const drawInteractions = map.getInteractions().getArray().filter(
      i => i.constructor.name === 'Draw'
    );
    expect(drawInteractions.length).toBe(0);
  });

  it('should reset isSubmitting to false even on network error', () => {
    mapDrawingService.setPolygonCoordinates(validCoords4326);
    TestBed.flushEffects();

    mapDrawingService.submitArea().subscribe({
      error: () => { /* expected */ },
    });
    expect(mapDrawingService.isSubmitting()).toBeTrue();

    // Simulate a network error
    const req = httpTesting.expectOne('/api/areas');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

    // isSubmitting should be reset to false via finalize()
    expect(mapDrawingService.isSubmitting()).toBeFalse();
  });
});
