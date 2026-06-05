import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FlightPlansApiService } from './flight-plans.service';
import { CalculateFlightPathRequest } from '../models/calculate-flight-path-request';
import { FlightPlanResponse } from '../models/flight-plan-response';
import { ExportFormat } from '../models/export-format';

describe('FlightPlansApiService', () => {
  let service: FlightPlansApiService;
  let httpTesting: HttpTestingController;

  const mockFlightPlan: FlightPlanResponse = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    areaId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    mode: 'Grid',
    waypoints: [
      {
        latitude: 52.2297,
        longitude: 21.0122,
        altitudeAglM: 80,
        gimbalPitchDegrees: -90,
        gimbalYawDegrees: 0,
      },
    ],
    statistics: {
      totalDistanceM: 1500,
      estimatedFlightTimeS: 300,
      photoCount: 42,
      coveredAreaM2: 10000,
    },
    createdAt: '2026-06-04T10:30:00Z',
  };

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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculate', () => {
    it('should send POST to /api/flight-plans with correct body', () => {
      const request: CalculateFlightPathRequest = {
        areaId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        mode: 'Grid',
        grid: {
          altitudeM: 80,
          camera: {
            sensorWidthMm: 13.2,
            focalLengthMm: 8.8,
            imageWidthPx: 4000,
            imageHeightPx: 3000,
          },
          frontOverlapPercent: 75,
          sideOverlapPercent: 65,
          headingDegrees: null,
        },
        poi: null,
      };

      service.calculate(request).subscribe((response) => {
        expect(response).toEqual(mockFlightPlan);
      });

      const req = httpTesting.expectOne('/api/flight-plans');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);

      req.flush(mockFlightPlan);
    });
  });

  describe('getById', () => {
    it('should send GET to /api/flight-plans/{id}', () => {
      const id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

      service.getById(id).subscribe((response) => {
        expect(response).toEqual(mockFlightPlan);
      });

      const req = httpTesting.expectOne(`/api/flight-plans/${id}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockFlightPlan);
    });
  });

  describe('list', () => {
    it('should send GET to /api/flight-plans without params when none provided', () => {
      const mockList: FlightPlanResponse[] = [mockFlightPlan];

      service.list().subscribe((response) => {
        expect(response).toEqual(mockList);
      });

      const req = httpTesting.expectOne('/api/flight-plans');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);

      req.flush(mockList);
    });

    it('should send GET to /api/flight-plans with areaId query param', () => {
      const areaId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const mockList: FlightPlanResponse[] = [mockFlightPlan];

      service.list({ areaId }).subscribe((response) => {
        expect(response).toEqual(mockList);
      });

      const req = httpTesting.expectOne(
        (r) => r.url === '/api/flight-plans' && r.params.get('areaId') === areaId
      );
      expect(req.request.method).toBe('GET');

      req.flush(mockList);
    });

    it('should send GET to /api/flight-plans without areaId when param object has no areaId', () => {
      const mockList: FlightPlanResponse[] = [];

      service.list({}).subscribe((response) => {
        expect(response).toEqual(mockList);
      });

      const req = httpTesting.expectOne('/api/flight-plans');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.has('areaId')).toBeFalse();

      req.flush(mockList);
    });
  });

  describe('exportMissionFile', () => {
    const id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    it('should send GET to /api/flight-plans/{id}/export?format=LitchiCsv with blob responseType', () => {
      const format: ExportFormat = 'LitchiCsv';
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });

      service.exportMissionFile(id, format).subscribe((response) => {
        expect(response.body).toEqual(mockBlob);
      });

      const req = httpTesting.expectOne(
        (r) => r.url === `/api/flight-plans/${id}/export` && r.params.get('format') === 'LitchiCsv'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      req.flush(mockBlob, {
        headers: { 'Content-Disposition': 'attachment; filename="flight-plan.csv"' },
      });
    });

    it('should send GET to /api/flight-plans/{id}/export?format=Kml with blob responseType', () => {
      const format: ExportFormat = 'Kml';
      const mockBlob = new Blob(['<kml></kml>'], { type: 'application/vnd.google-earth.kml+xml' });

      service.exportMissionFile(id, format).subscribe((response) => {
        expect(response.body).toEqual(mockBlob);
      });

      const req = httpTesting.expectOne(
        (r) => r.url === `/api/flight-plans/${id}/export` && r.params.get('format') === 'Kml'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      req.flush(mockBlob, {
        headers: { 'Content-Disposition': 'attachment; filename="flight-plan.kml"' },
      });
    });

    it('should send GET to /api/flight-plans/{id}/export?format=DjiWpml with blob responseType', () => {
      const format: ExportFormat = 'DjiWpml';
      const mockBlob = new Blob(['<wpml></wpml>'], { type: 'application/xml' });

      service.exportMissionFile(id, format).subscribe((response) => {
        expect(response.body).toEqual(mockBlob);
      });

      const req = httpTesting.expectOne(
        (r) => r.url === `/api/flight-plans/${id}/export` && r.params.get('format') === 'DjiWpml'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      req.flush(mockBlob, {
        headers: { 'Content-Disposition': 'attachment; filename="flight-plan.wpml"' },
      });
    });

    it('should return full HttpResponse including headers', () => {
      const format: ExportFormat = 'LitchiCsv';
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });

      service.exportMissionFile(id, format).subscribe((response) => {
        expect(response.headers.get('Content-Disposition')).toBe(
          'attachment; filename="flight-plan.csv"'
        );
        expect(response.body).toBeTruthy();
      });

      const req = httpTesting.expectOne(
        (r) => r.url === `/api/flight-plans/${id}/export` && r.params.get('format') === 'LitchiCsv'
      );

      req.flush(mockBlob, {
        headers: { 'Content-Disposition': 'attachment; filename="flight-plan.csv"' },
      });
    });
  });
});
