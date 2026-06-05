import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AreasApiService } from './areas.service';
import { AreaResponse } from '../models/area-response';

describe('AreasApiService', () => {
  let service: AreasApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AreasApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listAreas', () => {
    it('should send a GET request to /api/areas and return AreaResponse[]', () => {
      const mockAreas: AreaResponse[] = [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          createdAt: '2026-06-04T12:00:00Z',
          geometry: {
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
          },
        },
        {
          id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          createdAt: '2026-06-03T08:00:00Z',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [20.0, 51.0],
                [20.1, 51.0],
                [20.1, 51.1],
                [20.0, 51.1],
                [20.0, 51.0],
              ],
            ],
          },
        },
      ];

      service.listAreas().subscribe((areas) => {
        expect(areas).toEqual(mockAreas);
        expect(areas.length).toBe(2);
      });

      const req = httpTesting.expectOne('/api/areas');
      expect(req.request.method).toBe('GET');

      req.flush(mockAreas);
    });

    it('should return an empty array when no areas exist', () => {
      service.listAreas().subscribe((areas) => {
        expect(areas).toEqual([]);
        expect(areas.length).toBe(0);
      });

      const req = httpTesting.expectOne('/api/areas');
      expect(req.request.method).toBe('GET');

      req.flush([]);
    });

    it('should propagate HTTP errors through the Observable error channel', () => {
      service.listAreas().subscribe({
        next: () => fail('Expected an error, not a success response'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(error.status).toBe(500);
        },
      });

      const req = httpTesting.expectOne('/api/areas');
      req.flush(
        { message: 'Internal server error' },
        { status: 500, statusText: 'Internal Server Error' }
      );
    });
  });
});
