import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import * as fc from 'fast-check';
import { FlightPlansApiService } from './flight-plans.service';
import { AreasApiService } from './areas.service';
import { CalculateFlightPathRequest } from '../models/calculate-flight-path-request';
import { FlightMode } from '../models/flight-mode';
import { ExportFormat } from '../models/export-format';
import { GridModeParametersDto } from '../models/grid-mode-parameters-dto';
import { PoiModeParametersDto } from '../models/poi-mode-parameters-dto';
import { CameraParametersDto } from '../models/camera-parameters-dto';

/**
 * Property-Based Tests for FlightPlansApiService HTTP Request Construction
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 4.1, 5.1**
 *
 * Feature: frontend-api-integration
 * Property 3: FlightPlansApiService constructs correct HTTP requests
 *
 * For any valid method call on FlightPlansApiService (calculate with any CalculateFlightPathRequest,
 * getById with any GUID string, list with any optional areaId, export with any GUID and ExportFormat),
 * the service shall issue an HTTP request with the correct method, URL path, query parameters,
 * request body, and response type.
 */
describe('Feature: frontend-api-integration, Property 3: FlightPlansApiService constructs correct HTTP requests', () => {
  let service: FlightPlansApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FlightPlansApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  // --- Generators ---

  const cameraParametersArb = (): fc.Arbitrary<CameraParametersDto> => {
    return fc.record({
      sensorWidthMm: fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
      focalLengthMm: fc.double({ min: 0.1, max: 500, noNaN: true, noDefaultInfinity: true }),
      imageWidthPx: fc.integer({ min: 1, max: 20000 }),
      imageHeightPx: fc.integer({ min: 1, max: 20000 }),
    });
  };

  const gridModeParametersArb = (): fc.Arbitrary<GridModeParametersDto> => {
    return fc.record({
      altitudeM: fc.double({ min: 1, max: 500, noNaN: true, noDefaultInfinity: true }),
      camera: cameraParametersArb(),
      frontOverlapPercent: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
      sideOverlapPercent: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
      headingDegrees: fc.oneof(
        fc.constant(null),
        fc.double({ min: 0, max: 360, noNaN: true, noDefaultInfinity: true })
      ),
    });
  };

  const poiModeParametersArb = (): fc.Arbitrary<PoiModeParametersDto> => {
    return fc.record({
      centerLatitude: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
      centerLongitude: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
      radiusM: fc.double({ min: 1, max: 10000, noNaN: true, noDefaultInfinity: true }),
      altitudeM: fc.double({ min: 1, max: 500, noNaN: true, noDefaultInfinity: true }),
      gimbalPitchDegrees: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
      photoCount: fc.oneof(
        fc.constant(null),
        fc.integer({ min: 1, max: 1000 })
      ),
      overlapPercent: fc.oneof(
        fc.constant(null),
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
      ),
      cameraHorizontalFovDegrees: fc.oneof(
        fc.constant(null),
        fc.double({ min: 1, max: 180, noNaN: true, noDefaultInfinity: true })
      ),
      structureHeightM: fc.oneof(
        fc.constant(null),
        fc.double({ min: 0.1, max: 1000, noNaN: true, noDefaultInfinity: true })
      ),
    });
  };

  const calculateFlightPathRequestArb = (): fc.Arbitrary<CalculateFlightPathRequest> => {
    return fc.oneof(
      fc.record({
        areaId: fc.uuid(),
        mode: fc.constant('Grid' as FlightMode),
        grid: gridModeParametersArb(),
        poi: fc.constant(null),
      }),
      fc.record({
        areaId: fc.uuid(),
        mode: fc.constant('Poi' as FlightMode),
        grid: fc.constant(null),
        poi: poiModeParametersArb(),
      })
    );
  };

  const uuidArb = (): fc.Arbitrary<string> => fc.uuid();

  const exportFormatArb = (): fc.Arbitrary<ExportFormat> =>
    fc.constantFrom('LitchiCsv' as ExportFormat, 'Kml' as ExportFormat, 'DjiWpml' as ExportFormat);

  const optionalAreaIdArb = (): fc.Arbitrary<string | undefined> =>
    fc.oneof(fc.constant(undefined), fc.uuid());

  // --- Property Tests ---

  // **Validates: Requirements 2.1**
  describe('calculate() sends POST to /api/flight-plans with correct body', () => {
    it('for any CalculateFlightPathRequest, issues POST with correct URL and body', () => {
      const property = fc.property(calculateFlightPathRequestArb(), (request: CalculateFlightPathRequest) => {
        service.calculate(request).subscribe();

        const req = httpTesting.expectOne('/api/flight-plans');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(request);

        req.flush({});
      });

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });

  // **Validates: Requirements 2.2**
  describe('getById() sends GET to /api/flight-plans/{id}', () => {
    it('for any UUID string, issues GET to correct URL path', () => {
      const property = fc.property(uuidArb(), (id: string) => {
        service.getById(id).subscribe();

        const req = httpTesting.expectOne(`/api/flight-plans/${id}`);
        expect(req.request.method).toBe('GET');

        req.flush({});
      });

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });

  // **Validates: Requirements 4.1**
  describe('list() sends GET to /api/flight-plans with optional areaId param', () => {
    it('for any optional areaId, issues GET with correct query params', () => {
      const property = fc.property(optionalAreaIdArb(), (areaId: string | undefined) => {
        if (areaId) {
          service.list({ areaId }).subscribe();
        } else {
          service.list().subscribe();
        }

        const req = httpTesting.expectOne((r) => r.url === '/api/flight-plans');
        expect(req.request.method).toBe('GET');

        if (areaId) {
          expect(req.request.params.get('areaId')).toBe(areaId);
        } else {
          expect(req.request.params.has('areaId')).toBeFalse();
        }

        req.flush([]);
      });

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });

  // **Validates: Requirements 2.3, 5.1**
  describe('exportMissionFile() sends GET to /api/flight-plans/{id}/export with format param and blob responseType', () => {
    it('for any UUID and ExportFormat, issues GET with correct URL, query param, and responseType', () => {
      const property = fc.property(uuidArb(), exportFormatArb(), (id: string, format: ExportFormat) => {
        service.exportMissionFile(id, format).subscribe();

        const req = httpTesting.expectOne(
          (r) => r.url === `/api/flight-plans/${id}/export` && r.params.get('format') === format
        );
        expect(req.request.method).toBe('GET');
        expect(req.request.responseType).toBe('blob');

        req.flush(new Blob(['test']), {
          headers: { 'Content-Disposition': 'attachment; filename="test.csv"' },
        });
      });

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });
});


/**
 * Property-Based Tests for API Error Propagation
 *
 * **Validates: Requirements 2.4, 3.4, 5.4, 5.5**
 *
 * Feature: frontend-api-integration, Property 4: API services propagate HTTP errors unchanged
 *
 * For any HTTP error status code returned by the backend, both FlightPlansApiService and
 * AreasApiService shall propagate the HttpErrorResponse through the Observable error channel
 * without catching, wrapping, or transforming it.
 */
describe('Feature: frontend-api-integration, Property 4: API services propagate HTTP errors unchanged', () => {
  let flightPlansService: FlightPlansApiService;
  let areasService: AreasApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    flightPlansService = TestBed.inject(FlightPlansApiService);
    areasService = TestBed.inject(AreasApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  /**
   * Generates an arbitrary HTTP error status code (400-599).
   */
  function arbHttpErrorStatus(): fc.Arbitrary<number> {
    return fc.integer({ min: 400, max: 599 });
  }

  // **Validates: Requirements 2.4, 5.4, 5.5**

  it('FlightPlansApiService.getById propagates HTTP errors with unchanged status code', () => {
    const result = fc.check(
      fc.property(
        arbHttpErrorStatus(),
        (statusCode) => {
          let receivedError: HttpErrorResponse | undefined;

          flightPlansService.getById('test-id').subscribe({
            next: () => { /* should not emit */ },
            error: (err: HttpErrorResponse) => { receivedError = err; },
          });

          const req = httpTesting.expectOne('/api/flight-plans/test-id');
          req.flush('Error', { status: statusCode, statusText: 'Error' });

          if (!receivedError) return false;
          return (receivedError as HttpErrorResponse).status === statusCode;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });

  // **Validates: Requirements 3.4**

  it('AreasApiService.listAreas propagates HTTP errors with unchanged status code', () => {
    const result = fc.check(
      fc.property(
        arbHttpErrorStatus(),
        (statusCode) => {
          let receivedError: HttpErrorResponse | undefined;

          areasService.listAreas().subscribe({
            next: () => { /* should not emit */ },
            error: (err: HttpErrorResponse) => { receivedError = err; },
          });

          const req = httpTesting.expectOne('/api/areas');
          req.flush('Error', { status: statusCode, statusText: 'Error' });

          if (!receivedError) return false;
          return (receivedError as HttpErrorResponse).status === statusCode;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });
});
