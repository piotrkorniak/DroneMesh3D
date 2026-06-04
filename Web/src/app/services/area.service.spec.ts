import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AreaService } from './area.service';
import { CreateAreaRequest } from '../api/models/create-area-request';
import { AreaResponse } from '../api/models/area-response';

describe('AreaService', () => {
  let service: AreaService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AreaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createArea', () => {
    it('should make a POST request to /api/areas with the correct payload', () => {
      const request: CreateAreaRequest = {
        type: 'Polygon',
        coordinates: [
          [
            [21.0122, 52.2297],
            [21.0130, 52.2297],
            [21.0130, 52.2290],
            [21.0122, 52.2290],
            [21.0122, 52.2297],
          ],
        ],
      };

      const mockResponse: AreaResponse = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: '2026-06-04T10:30:00Z',
        geometry: {
          type: 'Polygon',
          coordinates: request.coordinates,
        },
      };

      service.createArea(request).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpTesting.expectOne('/api/areas');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);

      req.flush(mockResponse);
    });

    it('should emit an error Observable on network error', () => {
      const request: CreateAreaRequest = {
        type: 'Polygon',
        coordinates: [
          [
            [21.0, 52.0],
            [21.1, 52.0],
            [21.1, 52.1],
            [21.0, 52.1],
            [21.0, 52.0],
          ],
        ],
      };

      service.createArea(request).subscribe({
        next: () => fail('Expected an error, not a success response'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(error.status).toBe(0);
        },
      });

      const req = httpTesting.expectOne('/api/areas');
      req.error(new ProgressEvent('Network error'), { status: 0, statusText: 'Unknown Error' });
    });
  });
});
