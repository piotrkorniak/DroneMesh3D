import { PolygonValidatorService } from './polygon-validator.service';
import { ValidationRule } from '../models/validation';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for PolygonValidatorService - Vertex Count Validation
 *
 * **Validates: Requirements 3.1**
 *
 * Requirement 3.1: WHEN the user finishes drawing a polygon,
 * THE Polygon_Validator SHALL verify that the polygon contains at least 3 vertices.
 */
describe('PolygonValidatorService - Property: Walidacja liczby wierzchołków', () => {
  let service: PolygonValidatorService;

  beforeEach(() => {
    service = new PolygonValidatorService();
  });

  /**
   * Generator for a coordinate pair [longitude, latitude] within valid ranges.
   */
  const coordinateArb = (): fc.Arbitrary<number[]> =>
    fc.tuple(
      fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true })
    ).map(([lng, lat]) => [lng, lat]);

  /**
   * Generator for arrays of distinct coordinates with exactly `count` unique vertices.
   * Returns the raw array of coordinates (not closed).
   */
  const distinctCoordinatesArb = (minCount: number, maxCount: number): fc.Arbitrary<number[][]> =>
    fc.integer({ min: minCount, max: maxCount }).chain(count =>
      fc.array(coordinateArb(), { minLength: count, maxLength: count })
    ).filter(coords => {
      // Ensure all coordinates are truly distinct
      const set = new Set(coords.map(c => `${c[0]},${c[1]}`));
      return set.size === coords.length;
    });

  /**
   * Property 1a: Arrays with fewer than 3 distinct vertices should produce MIN_VERTICES error.
   *
   * Strategy: Generate 0, 1, or 2 distinct coordinates. These represent polygons
   * with insufficient vertices regardless of whether the polygon is closed or open.
   */
  it('should return MIN_VERTICES error for polygons with < 3 distinct vertices (open)', () => {
    const property = fc.property(
      distinctCoordinatesArb(0, 2),
      (coordinates) => {
        const result = service.validate(coordinates);
        const hasMinVerticesError = result.errors.some(
          e => e.rule === ValidationRule.MinVertices
        );
        return hasMinVerticesError;
      }
    );

    expect(() => fc.assert(property, { numRuns: 200 })).not.toThrow();
  });

  it('should return MIN_VERTICES error for closed polygons with < 3 distinct vertices', () => {
    const property = fc.property(
      distinctCoordinatesArb(1, 2),
      (coordinates) => {
        // Close the polygon by appending the first coordinate
        const closed = [...coordinates, coordinates[0]];
        const result = service.validate(closed);
        const hasMinVerticesError = result.errors.some(
          e => e.rule === ValidationRule.MinVertices
        );
        return hasMinVerticesError;
      }
    );

    expect(() => fc.assert(property, { numRuns: 200 })).not.toThrow();
  });

  /**
   * Property 1b: Arrays with >= 3 distinct vertices should NOT produce MIN_VERTICES error.
   *
   * Strategy: Generate 3 to 20 distinct coordinates. Validate that the MIN_VERTICES
   * rule does not appear in the errors (other validation errors may occur).
   */
  it('should NOT return MIN_VERTICES error for open polygons with >= 3 distinct vertices', () => {
    const property = fc.property(
      distinctCoordinatesArb(3, 20),
      (coordinates) => {
        const result = service.validate(coordinates);
        const hasMinVerticesError = result.errors.some(
          e => e.rule === ValidationRule.MinVertices
        );
        return !hasMinVerticesError;
      }
    );

    expect(() => fc.assert(property, { numRuns: 200 })).not.toThrow();
  });

  it('should NOT return MIN_VERTICES error for closed polygons with >= 3 distinct vertices', () => {
    const property = fc.property(
      distinctCoordinatesArb(3, 20),
      (coordinates) => {
        // Close the polygon by appending the first coordinate
        const closed = [...coordinates, coordinates[0]];
        const result = service.validate(closed);
        const hasMinVerticesError = result.errors.some(
          e => e.rule === ValidationRule.MinVertices
        );
        return !hasMinVerticesError;
      }
    );

    expect(() => fc.assert(property, { numRuns: 200 })).not.toThrow();
  });
});
