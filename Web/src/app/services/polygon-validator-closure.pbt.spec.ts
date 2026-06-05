import * as fc from 'fast-check';
import { PolygonValidatorService } from './polygon-validator.service';
import { ValidationRule } from '../models/validation';

/**
 * Property-Based Tests for Polygon Closure Validation
 *
 * **Validates: Requirements 3.2**
 *
 * Requirement 3.2: WHEN użytkownik zakończy rysowanie poligonu, THE Polygon_Validator
 * SHALL zweryfikować, że poligon jest zamkniętym kształtem, w którym pierwsza i ostatnia
 * współrzędna są identyczne.
 */
describe('PolygonValidatorService - Property 2: Walidacja zamknięcia poligonu', () => {
  let service: PolygonValidatorService;

  beforeEach(() => {
    service = new PolygonValidatorService();
  });

  /**
   * Arbitrary generating a coordinate pair [longitude, latitude]
   * within valid geographic bounds.
   */
  const coordinateArb = fc.tuple(
    fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -85, max: 85, noNaN: true, noDefaultInfinity: true })
  ).map(([lng, lat]) => [lng, lat]);

  /**
   * Arbitrary generating an array of coordinates where first !== last (open polygon).
   * Generates at least 3 distinct coordinates to focus only on closure validation.
   */
  const openPolygonArb = fc
    .array(coordinateArb, { minLength: 3, maxLength: 20 })
    .filter((coords) => {
      const first = coords[0];
      const last = coords[coords.length - 1];
      // Ensure first != last to create an open (non-closed) polygon
      return first[0] !== last[0] || first[1] !== last[1];
    });

  /**
   * Arbitrary generating an array of coordinates where first === last (closed polygon).
   * Generates at least 3 distinct vertices + closing point.
   */
  const closedPolygonArb = fc
    .array(coordinateArb, { minLength: 3, maxLength: 20 })
    .map((coords) => {
      // Append a copy of the first coordinate to close the polygon
      return [...coords, [coords[0][0], coords[0][1]]];
    });

  describe('Property 2a: Open polygons (first ≠ last) produce CLOSURE error', () => {
    it('should return CLOSURE error when first and last coordinates differ', () => {
      fc.assert(
        fc.property(openPolygonArb, (coordinates) => {
          const result = service.validate(coordinates);
          const hasClosure = result.errors.some(
            (e) => e.rule === ValidationRule.Closure
          );
          expect(hasClosure).toBeTrue();
        }),
        { numRuns: 200 }
      );
    });

    it('isClosed() should return false for open polygons', () => {
      fc.assert(
        fc.property(openPolygonArb, (coordinates) => {
          expect(service.isClosed(coordinates)).toBeFalse();
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Property 2b: Closed polygons (first = last) produce no CLOSURE error', () => {
    it('should NOT return CLOSURE error when first and last coordinates are identical', () => {
      fc.assert(
        fc.property(closedPolygonArb, (coordinates) => {
          const result = service.validate(coordinates);
          const hasClosure = result.errors.some(
            (e) => e.rule === ValidationRule.Closure
          );
          expect(hasClosure).toBeFalse();
        }),
        { numRuns: 200 }
      );
    });

    it('isClosed() should return true for closed polygons', () => {
      fc.assert(
        fc.property(closedPolygonArb, (coordinates) => {
          expect(service.isClosed(coordinates)).toBeTrue();
        }),
        { numRuns: 200 }
      );
    });
  });
});
