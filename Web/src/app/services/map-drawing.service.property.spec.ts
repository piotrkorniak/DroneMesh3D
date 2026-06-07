import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { MapDrawingService } from './map-drawing.service';
import { AreaService } from './area.service';
import { SelectionStateService } from './selection-state.service';
import { PolygonValidatorService } from './polygon-validator.service';
import { ValidationResult, ValidationRule } from '../models/validation';

/**
 * Feature: ux-area-management-redesign, Property 1: Validation error display truncation
 *
 * Validates: Requirements 1.6
 */
describe('MapDrawingService - Property Tests', () => {
  let service: MapDrawingService;
  let polygonValidatorSpy: jasmine.SpyObj<PolygonValidatorService>;

  const dummyCoords: number[][] = [
    [20.0, 50.0],
    [20.001, 50.0],
    [20.001, 50.001],
    [20.0, 50.001],
    [20.0, 50.0],
  ];

  beforeEach(() => {
    const areaServiceSpy = jasmine.createSpyObj('AreaService', ['createArea']);
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
  });

  describe('Property 1: Validation error display truncation', () => {
    it('should emit at most min(N, 5) validation errors and isValid is false when N > 0', () => {
      const property = fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 20 }),
        (errorMessages: string[]) => {
          const N = errorMessages.length;

          const validationResult: ValidationResult = {
            isValid: N === 0,
            errors: errorMessages.map(msg => ({
              rule: ValidationRule.MinVertices,
              message: msg,
            })),
          };

          polygonValidatorSpy.validate.and.returnValue(validationResult);
          service.setPolygonCoordinates(dummyCoords);

          const emittedErrors = service.validationErrors();
          const expectedMaxLength = Math.min(N, 5);

          // validationErrors emits at most min(N, 5) items
          if (emittedErrors.length > expectedMaxLength) {
            return false;
          }

          // isValid is false when N > 0
          if (N > 0 && service.isValid() !== false) {
            return false;
          }

          // isValid is true when N === 0
          if (N === 0 && service.isValid() !== true) {
            return false;
          }

          return true;
        }
      );

      // fc.assert throws on failure; wrap in expect to satisfy Jasmine
      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });
});
