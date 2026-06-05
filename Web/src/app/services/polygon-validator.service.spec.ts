import { TestBed } from '@angular/core/testing';
import { PolygonValidatorService } from './polygon-validator.service';
import { ValidationRule } from '../models/validation';

describe('PolygonValidatorService', () => {
  let service: PolygonValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PolygonValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('MIN_VERTICES validation', () => {
    it('should return MIN_VERTICES error for polygon with only 2 distinct vertices', () => {
      // Only 2 distinct vertices: [0,0] and [1,1], closed back to [0,0]
      const coordinates = [[0, 0], [1, 1], [0, 0]];

      const result = service.validate(coordinates);

      expect(result.isValid).toBeFalse();
      expect(result.errors.some(e => e.rule === ValidationRule.MinVertices)).toBeTrue();
    });
  });

  describe('CLOSURE validation', () => {
    it('should return CLOSURE error for unclosed polygon', () => {
      // 3 distinct vertices but first != last (not closed)
      const coordinates = [[0, 0], [1, 0], [1, 1]];

      const result = service.validate(coordinates);

      expect(result.isValid).toBeFalse();
      expect(result.errors.some(e => e.rule === ValidationRule.Closure)).toBeTrue();
    });
  });

  describe('SELF_INTERSECTION validation', () => {
    it('should return SELF_INTERSECTION error for bowtie/butterfly shape', () => {
      // Bowtie shape: edges cross each other
      const coordinates = [[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]];

      const result = service.validate(coordinates);

      expect(result.isValid).toBeFalse();
      expect(result.errors.some(e => e.rule === ValidationRule.SelfIntersection)).toBeTrue();
    });
  });

  describe('valid polygon', () => {
    it('should return isValid = true for a valid polygon', () => {
      // A small rectangle near lat 52°N with reasonable area
      // Approx 88m x 111m ≈ ~9768 m² (well within 100 - 50000 m² range)
      const coordinates = [
        [21.0000, 52.0000],
        [21.0013, 52.0000],
        [21.0013, 52.0010],
        [21.0000, 52.0010],
        [21.0000, 52.0000],
      ];

      const result = service.validate(coordinates);

      expect(result.isValid).toBeTrue();
      expect(result.errors.length).toBe(0);
    });
  });
});
