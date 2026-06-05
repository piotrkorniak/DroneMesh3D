import { PolygonValidatorService } from './polygon-validator.service';
import { ValidationRule } from '../models/validation';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for Self-Intersection Detection
 * **Validates: Requirements 3.3**
 *
 * Property 3: Wykrywanie samoprzecięć
 * - Self-intersecting polygons → expected SELF_INTERSECTION error
 * - Simple (non-self-intersecting) polygons → no SELF_INTERSECTION error
 */
describe('PolygonValidatorService - Property 3: Self-Intersection Detection', () => {
  let service: PolygonValidatorService;

  beforeEach(() => {
    service = new PolygonValidatorService();
  });

  /**
   * Generator: Creates a "bowtie" (self-intersecting) polygon by taking 4 points
   * arranged in a convex quadrilateral, then swapping two non-adjacent vertices
   * to create crossing edges.
   *
   * Given a convex quadrilateral ABCD (ordered), swapping B and D gives ADCB
   * which creates two crossing diagonals as edges.
   */
  const selfIntersectingPolygonArb = (): fc.Arbitrary<number[][]> => {
    return fc
      .tuple(
        // Center point longitude and latitude
        fc.double({ min: -170, max: 170, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -80, max: 80, noNaN: true, noDefaultInfinity: true }),
        // Radius in degrees (small enough to be a valid local polygon)
        fc.double({ min: 0.001, max: 0.05, noNaN: true, noDefaultInfinity: true }),
        // 4 distinct angles for the convex quadrilateral vertices
        fc.tuple(
          fc.double({ min: 0, max: Math.PI / 2 - 0.01, noNaN: true, noDefaultInfinity: true }),
          fc.double({ min: Math.PI / 2 + 0.01, max: Math.PI - 0.01, noNaN: true, noDefaultInfinity: true }),
          fc.double({ min: Math.PI + 0.01, max: (3 * Math.PI) / 2 - 0.01, noNaN: true, noDefaultInfinity: true }),
          fc.double({ min: (3 * Math.PI) / 2 + 0.01, max: 2 * Math.PI - 0.01, noNaN: true, noDefaultInfinity: true })
        )
      )
      .map(([cx, cy, r, [a1, a2, a3, a4]]) => {
        // Generate 4 points on a circle (convex quadrilateral)
        const p1: number[] = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
        const p2: number[] = [cx + r * Math.cos(a2), cy + r * Math.sin(a2)];
        const p3: number[] = [cx + r * Math.cos(a3), cy + r * Math.sin(a3)];
        const p4: number[] = [cx + r * Math.cos(a4), cy + r * Math.sin(a4)];

        // Swap p2 and p4 to create a bowtie (self-intersecting shape)
        // Original order: p1, p2, p3, p4 (convex, no intersections)
        // Swapped order: p1, p4, p3, p2 (edges p1-p4 and p3-p2 will cross p4-p3 and p1-p2 originally)
        // Actually: p1, p3, p2, p4 creates a crossing
        // Simpler bowtie: p1, p3, p2, p4 — edge p1→p3 crosses edge p2→p4
        return [p1, p3, p2, p4, p1]; // closed polygon with crossing edges
      });
  };

  /**
   * Generator: Creates a simple (non-self-intersecting) convex polygon
   * by placing N points on a circle. Convex polygons are guaranteed to
   * have no self-intersections.
   */
  const simpleConvexPolygonArb = (): fc.Arbitrary<number[][]> => {
    return fc
      .tuple(
        // Center point longitude and latitude
        fc.double({ min: -170, max: 170, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -80, max: 80, noNaN: true, noDefaultInfinity: true }),
        // Radius in degrees
        fc.double({ min: 0.001, max: 0.05, noNaN: true, noDefaultInfinity: true }),
        // Number of vertices (3 to 8)
        fc.integer({ min: 3, max: 8 })
      )
      .map(([cx, cy, r, n]) => {
        // Place n points evenly around a circle — guaranteed convex
        const coords: number[][] = [];
        for (let i = 0; i < n; i++) {
          const angle = (2 * Math.PI * i) / n;
          coords.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
        }
        // Close the polygon
        coords.push([...coords[0]]);
        return coords;
      });
  };

  describe('Self-intersecting polygons should produce SELF_INTERSECTION error', () => {
    it('bowtie polygons (swapped vertices) are detected as self-intersecting', () => {
      const property = fc.property(selfIntersectingPolygonArb(), (coordinates: number[][]) => {
        const result = service.validate(coordinates);
        const hasSelfIntersectionError = result.errors.some(
          (e) => e.rule === ValidationRule.SelfIntersection
        );
        return hasSelfIntersectionError;
      });

      expect(() => fc.assert(property, { numRuns: 200 })).not.toThrow();
    });
  });

  describe('Simple (non-self-intersecting) polygons should NOT produce SELF_INTERSECTION error', () => {
    it('convex polygons (points on circle) never have self-intersections', () => {
      const property = fc.property(simpleConvexPolygonArb(), (coordinates: number[][]) => {
        const result = service.validate(coordinates);
        const hasSelfIntersectionError = result.errors.some(
          (e) => e.rule === ValidationRule.SelfIntersection
        );
        return !hasSelfIntersectionError;
      });

      expect(() => fc.assert(property, { numRuns: 200 })).not.toThrow();
    });
  });
});
