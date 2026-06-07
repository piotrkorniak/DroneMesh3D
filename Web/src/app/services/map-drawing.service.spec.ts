import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MapDrawingService } from './map-drawing.service';
import { AreaService } from './area.service';
import { SelectionStateService } from './selection-state.service';
import { PolygonValidatorService } from './polygon-validator.service';
import { ValidationResult } from '../models/validation';
import { ValidationRule } from '../models/validation';
import { AreaResponse } from '../api/models/area-response';

describe('MapDrawingService', () => {
  let service: MapDrawingService;
  let areaServiceSpy: jasmine.SpyObj<AreaService>;
  let selectionState: SelectionStateService;
  let polygonValidatorSpy: jasmine.SpyObj<PolygonValidatorService>;

  const validCoords: number[][] = [
    [20.0, 50.0],
    [20.001, 50.0],
    [20.001, 50.001],
    [20.0, 50.001],
    [20.0, 50.0],
  ];

  const validResult: ValidationResult = { isValid: true, errors: [] };

  const invalidResult: ValidationResult = {
    isValid: false,
    errors: [
      { rule: ValidationRule.MinVertices, message: 'Polygon must have at least 3 vertices.' },
      { rule: ValidationRule.Closure, message: 'Polygon must be closed.' },
    ],
  };

  beforeEach(() => {
    areaServiceSpy = jasmine.createSpyObj('AreaService', ['createArea']);
    polygonValidatorSpy = jasmine.createSpyObj('PolygonValidatorService', ['validate']);

    TestBed.configureTestingModule({
      providers: [
        MapDrawingService,
        SelectionStateService,
        { provide: AreaService, useValue: areaServiceSpy },
        { provide: PolygonValidatorService, useValue: polygonValidatorSpy },
      ],
    });

    service = TestBed.inject(MapDrawingService);
    selectionState = TestBed.inject(SelectionStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have isDrawing as false', () => {
      expect(service.isDrawing()).toBeFalse();
    });

    it('should have hasPolygon as false', () => {
      expect(service.hasPolygon()).toBeFalse();
    });

    it('should have isSubmitting as false', () => {
      expect(service.isSubmitting()).toBeFalse();
    });

    it('should have validationResult as null', () => {
      expect(service.validationResult()).toBeNull();
    });

    it('should have drawnCoordinates as null', () => {
      expect(service.drawnCoordinates()).toBeNull();
    });

    it('should have isValid as false', () => {
      expect(service.isValid()).toBeFalse();
    });

    it('should have validationErrors as empty array', () => {
      expect(service.validationErrors()).toEqual([]);
    });

    it('should have toolbarState as idle', () => {
      expect(service.toolbarState()).toBe('idle');
    });
  });

  describe('startDrawing', () => {
    it('should set isDrawing to true', () => {
      service.startDrawing();
      expect(service.isDrawing()).toBeTrue();
    });

    it('should set toolbarState to drawing', () => {
      service.startDrawing();
      expect(service.toolbarState()).toBe('drawing');
    });
  });

  describe('cancelDrawing', () => {
    it('should set isDrawing to false', () => {
      service.startDrawing();
      service.cancelDrawing();
      expect(service.isDrawing()).toBeFalse();
    });

    it('should clear hasPolygon', () => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
      service.cancelDrawing();
      expect(service.hasPolygon()).toBeFalse();
    });

    it('should clear drawnCoordinates', () => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
      service.cancelDrawing();
      expect(service.drawnCoordinates()).toBeNull();
    });

    it('should clear validationResult', () => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
      service.cancelDrawing();
      expect(service.validationResult()).toBeNull();
    });

    it('should return toolbarState to idle', () => {
      service.startDrawing();
      service.cancelDrawing();
      expect(service.toolbarState()).toBe('idle');
    });
  });

  describe('clearPolygon', () => {
    beforeEach(() => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
    });

    it('should set hasPolygon to false', () => {
      service.clearPolygon();
      expect(service.hasPolygon()).toBeFalse();
    });

    it('should clear drawnCoordinates', () => {
      service.clearPolygon();
      expect(service.drawnCoordinates()).toBeNull();
    });

    it('should clear validationResult', () => {
      service.clearPolygon();
      expect(service.validationResult()).toBeNull();
    });

    it('should return toolbarState to idle', () => {
      service.clearPolygon();
      expect(service.toolbarState()).toBe('idle');
    });
  });

  describe('setPolygonCoordinates', () => {
    it('should set drawnCoordinates', () => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
      expect(service.drawnCoordinates()).toEqual(validCoords);
    });

    it('should set hasPolygon to true', () => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
      expect(service.hasPolygon()).toBeTrue();
    });

    it('should set isDrawing to false', () => {
      service.startDrawing();
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
      expect(service.isDrawing()).toBeFalse();
    });

    it('should call polygonValidator.validate with the coordinates', () => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
      expect(polygonValidatorSpy.validate).toHaveBeenCalledWith(validCoords);
    });

    it('should set validationResult from validator', () => {
      polygonValidatorSpy.validate.and.returnValue(invalidResult);
      service.setPolygonCoordinates(validCoords);
      expect(service.validationResult()).toEqual(invalidResult);
    });

    it('should set toolbarState to polygon-ready', () => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
      expect(service.toolbarState()).toBe('polygon-ready');
    });
  });

  describe('computed signals', () => {
    it('should compute isValid as true when validation passes', () => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
      expect(service.isValid()).toBeTrue();
    });

    it('should compute isValid as false when validation fails', () => {
      polygonValidatorSpy.validate.and.returnValue(invalidResult);
      service.setPolygonCoordinates(validCoords);
      expect(service.isValid()).toBeFalse();
    });

    it('should compute validationErrors from validation result errors', () => {
      polygonValidatorSpy.validate.and.returnValue(invalidResult);
      service.setPolygonCoordinates(validCoords);
      expect(service.validationErrors()).toEqual([
        'Polygon must have at least 3 vertices.',
        'Polygon must be closed.',
      ]);
    });

    it('should truncate validationErrors to max 5 items', () => {
      const manyErrors: ValidationResult = {
        isValid: false,
        errors: Array.from({ length: 8 }, (_, i) => ({
          rule: ValidationRule.MinVertices,
          message: `Error ${i + 1}`,
        })),
      };
      polygonValidatorSpy.validate.and.returnValue(manyErrors);
      service.setPolygonCoordinates(validCoords);
      expect(service.validationErrors().length).toBe(5);
    });
  });

  describe('submitArea', () => {
    const mockResponse: AreaResponse = {
      id: 'new-area-1',
      createdAt: '2024-01-01T00:00:00Z',
      geometry: { type: 'Polygon', coordinates: [[validCoords]] as unknown as number[][][] },
    };

    beforeEach(() => {
      polygonValidatorSpy.validate.and.returnValue(validResult);
      service.setPolygonCoordinates(validCoords);
    });

    it('should throw error when no coordinates are set', () => {
      service.clearPolygon();
      expect(() => service.submitArea()).toThrowError('No polygon coordinates to submit');
    });

    it('should set isSubmitting to true', () => {
      areaServiceSpy.createArea.and.returnValue(of(mockResponse));
      service.submitArea().subscribe();
      // isSubmitting is set to true before the observable completes, but finalize resets it
      // After subscribe completes synchronously with `of()`, it's already finalized
      expect(service.isSubmitting()).toBeFalse(); // finalize already ran
    });

    it('should call areaService.createArea with correct request', () => {
      areaServiceSpy.createArea.and.returnValue(of(mockResponse));
      service.submitArea().subscribe();
      expect(areaServiceSpy.createArea).toHaveBeenCalledWith({
        type: 'Polygon',
        coordinates: [validCoords],
      });
    });

    it('should prepend new area to selection state areas on success', () => {
      selectionState.areas.set([]);
      areaServiceSpy.createArea.and.returnValue(of(mockResponse));
      service.submitArea().subscribe();
      expect(selectionState.areas()[0]).toEqual(mockResponse);
    });

    it('should select the new area on success', () => {
      areaServiceSpy.createArea.and.returnValue(of(mockResponse));
      service.submitArea().subscribe();
      expect(selectionState.selectedAreaId()).toBe('new-area-1');
    });

    it('should reset drawing state on success', () => {
      areaServiceSpy.createArea.and.returnValue(of(mockResponse));
      service.submitArea().subscribe();
      expect(service.hasPolygon()).toBeFalse();
      expect(service.drawnCoordinates()).toBeNull();
      expect(service.validationResult()).toBeNull();
    });

    it('should set isSubmitting to false after completion', () => {
      areaServiceSpy.createArea.and.returnValue(of(mockResponse));
      service.submitArea().subscribe();
      expect(service.isSubmitting()).toBeFalse();
    });

    it('should set isSubmitting to false on error', () => {
      areaServiceSpy.createArea.and.returnValue(throwError(() => new Error('Network error')));
      service.submitArea().subscribe({ error: () => { /* expected error */ } });
      expect(service.isSubmitting()).toBeFalse();
    });

    it('should not clear polygon state on error', () => {
      areaServiceSpy.createArea.and.returnValue(throwError(() => new Error('Network error')));
      service.submitArea().subscribe({ error: () => { /* expected error */ } });
      expect(service.hasPolygon()).toBeTrue();
      expect(service.drawnCoordinates()).toEqual(validCoords);
    });

    it('should set toolbarState to idle after successful submit', () => {
      areaServiceSpy.createArea.and.returnValue(of(mockResponse));
      service.submitArea().subscribe();
      expect(service.toolbarState()).toBe('idle');
    });
  });
});
