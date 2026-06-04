import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { fromLonLat } from 'ol/proj';

import { MapComponent } from './map.component';
import { AreaResponse } from '../../api/models/area-response';

/**
 * Integration test: Full flow simulation
 * Draw polygon → validate → submit → HTTP 201 → verify signal state transitions
 *
 * This test serves as the closest automated equivalent to an e2e test
 * for the map area definition flow, without requiring a browser automation tool.
 */
describe('MapComponent Integration (end-to-end flow)', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let httpTesting: HttpTestingController;

  // Valid polygon coordinates in EPSG:4326 (lon, lat) — a small square in Warsaw
  const validCoords4326: number[][] = [
    [21.0122, 52.2297],
    [21.0132, 52.2297],
    [21.0132, 52.2287],
    [21.0122, 52.2287],
    [21.0122, 52.2297], // closed ring
  ];

  // Same coordinates transformed to EPSG:3857 (Web Mercator) for OpenLayers
  const validCoords3857: number[][] = validCoords4326.map(coord => fromLonLat(coord));

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

    // Initialize the map (ngOnInit)
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should complete the full flow: add polygon → validate → submit → 201 Created', () => {
    // --- Step 1: Simulate drawing a polygon by adding a feature to vectorSource ---
    const polygon = new Polygon([validCoords3857]);
    const feature = new Feature({ geometry: polygon });
    component.vectorSource.addFeature(feature);
    component.hasPolygon.set(true);

    // --- Step 2: Trigger validation (simulating what happens after drawend) ---
    const polygonValidator = (component as any).polygonValidator;
    const validationResult = polygonValidator.validate(validCoords4326);
    component.validationResult.set(validationResult);

    // Verify that validation passes for this polygon
    expect(component.isValid()).toBeTrue();
    expect(component.validationErrors()).toEqual([]);
    expect(component.hasPolygon()).toBeTrue();

    // --- Step 3: Verify pre-submission state ---
    expect(component.isSubmitting()).toBeFalse();
    expect(component.submissionError()).toBeNull();

    // --- Step 4: Call submitArea() ---
    component.submitArea();

    // --- Step 5: Verify isSubmitting is true while request is in flight ---
    expect(component.isSubmitting()).toBeTrue();
    expect(component.submissionError()).toBeNull();

    // --- Step 6: Mock the HTTP response (201 Created with AreaResponse) ---
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

    // --- Step 7: Verify post-submission state ---
    expect(component.isSubmitting()).toBeFalse();
    expect(component.submissionError()).toBeNull();
  });

  it('should handle submission error and set submissionError signal', () => {
    // Add polygon and validate
    const polygon = new Polygon([validCoords3857]);
    const feature = new Feature({ geometry: polygon });
    component.vectorSource.addFeature(feature);
    component.hasPolygon.set(true);

    const polygonValidator = (component as any).polygonValidator;
    const validationResult = polygonValidator.validate(validCoords4326);
    component.validationResult.set(validationResult);

    // Submit
    component.submitArea();
    expect(component.isSubmitting()).toBeTrue();

    // Mock a 422 error response
    const errorResponse = {
      message: 'Validation failed.',
      errors: ['Polygon area exceeds maximum of 5 hectares.'],
    };

    const req = httpTesting.expectOne('/api/areas');
    req.flush(errorResponse, { status: 422, statusText: 'Unprocessable Entity' });

    // Verify error state
    expect(component.isSubmitting()).toBeFalse();
    expect(component.submissionError()).toBe('Validation failed.');
  });

  it('should not submit when vectorSource has no features', () => {
    // Ensure vectorSource is empty
    expect(component.vectorSource.getFeatures().length).toBe(0);

    // Attempt to submit — should return early without making any HTTP call
    component.submitArea();

    expect(component.isSubmitting()).toBeFalse();
    httpTesting.expectNone('/api/areas');
  });

  it('should transform coordinates from EPSG:3857 to EPSG:4326 in the request body', () => {
    // Add a polygon in EPSG:3857 (Web Mercator) as OpenLayers would
    const polygon = new Polygon([validCoords3857]);
    const feature = new Feature({ geometry: polygon });
    component.vectorSource.addFeature(feature);
    component.hasPolygon.set(true);
    component.validationResult.set({ isValid: true, errors: [] });

    component.submitArea();

    const req = httpTesting.expectOne('/api/areas');
    const submittedCoords = req.request.body.coordinates[0];

    // Verify coordinates are in EPSG:4326 range (not EPSG:3857 which would be millions)
    for (const coord of submittedCoords) {
      // Longitude should be in [-180, 180] range
      expect(coord[0]).toBeGreaterThan(-180);
      expect(coord[0]).toBeLessThan(180);
      // Latitude should be in [-90, 90] range
      expect(coord[1]).toBeGreaterThan(-90);
      expect(coord[1]).toBeLessThan(90);
    }

    // Verify first coordinate is approximately what we expect (21.0122, 52.2297)
    expect(submittedCoords[0][0]).toBeCloseTo(21.0122, 3);
    expect(submittedCoords[0][1]).toBeCloseTo(52.2297, 3);

    // Flush to avoid afterEach verify failure
    req.flush({
      id: 'test-id',
      createdAt: '2026-01-01T00:00:00Z',
      geometry: { type: 'Polygon', coordinates: [validCoords4326] },
    }, { status: 201, statusText: 'Created' });
  });

  it('should reset isSubmitting to false even on network error', () => {
    // Add polygon
    const polygon = new Polygon([validCoords3857]);
    const feature = new Feature({ geometry: polygon });
    component.vectorSource.addFeature(feature);
    component.hasPolygon.set(true);
    component.validationResult.set({ isValid: true, errors: [] });

    component.submitArea();
    expect(component.isSubmitting()).toBeTrue();

    // Simulate a network error
    const req = httpTesting.expectOne('/api/areas');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

    // isSubmitting should be reset to false via finalize()
    expect(component.isSubmitting()).toBeFalse();
    // submissionError should have a message
    expect(component.submissionError()).toBeTruthy();
  });
});
