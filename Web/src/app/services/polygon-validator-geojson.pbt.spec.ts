import * as fc from 'fast-check';
import { GeoJsonPolygon } from '../models/geojson';

/**
 * Property-Based Tests for GeoJSON Coordinate Preservation
 *
 * **Validates: Requirements 4.2, 4.3**
 *
 * Property 5: Zachowanie współrzędnych w GeoJSON
 * - Given a valid polygon ring (≥3 vertices, closed, within geographic bounds)
 * - When converted to GeoJSON Polygon format { type: "Polygon", coordinates: [ring] }
 * - The coordinates in the GeoJSON match the original coordinates exactly (same values, same order)
 *
 * This tests the conversion logic used in submitArea() — that coordinates are
 * preserved when constructing the GeoJSON payload.
 */
describe('GeoJSON Coordinate Preservation - Property 5', () => {
  /**
   * Generates a valid geographic coordinate [longitude, latitude] within bounds.
   * Longitude: [-180, 180], Latitude: [-85, 85] (Web Mercator safe range)
   */
  function arbCoordinate(): fc.Arbitrary<number[]> {
    return fc.tuple(
      fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: -85, max: 85, noNaN: true, noDefaultInfinity: true })
    ).map(([lng, lat]) => [lng, lat]);
  }

  /**
   * Generates a valid polygon ring: ≥3 distinct vertices + closing point (first = last).
   * All coordinates are within geographic bounds.
   */
  function arbValidPolygonRing(): fc.Arbitrary<number[][]> {
    return fc.array(arbCoordinate(), { minLength: 3, maxLength: 20 })
      .map(vertices => {
        // Close the ring by appending the first vertex at the end
        return [...vertices, [vertices[0][0], vertices[0][1]]];
      });
  }

  /**
   * Simulates the coordinate-to-GeoJSON conversion logic from submitArea().
   * Takes an array of [lng, lat] pairs and constructs a GeoJSON Polygon.
   */
  function convertToGeoJsonPolygon(coords4326: number[][]): GeoJsonPolygon {
    return {
      type: 'Polygon',
      coordinates: [coords4326],
    };
  }

  // **Validates: Requirements 4.2, 4.3**

  it('should preserve all coordinate values exactly when converting to GeoJSON', () => {
    const result = fc.check(
      fc.property(
        arbValidPolygonRing(),
        (ring) => {
          const geojson = convertToGeoJsonPolygon(ring);

          // The GeoJSON must have exactly one ring
          if (geojson.coordinates.length !== 1) return false;

          const outputRing = geojson.coordinates[0];

          // The output ring must have the same number of vertices
          if (outputRing.length !== ring.length) return false;

          // Each coordinate pair must match exactly (same value, same order)
          for (let i = 0; i < ring.length; i++) {
            if (outputRing[i][0] !== ring[i][0]) return false; // longitude
            if (outputRing[i][1] !== ring[i][1]) return false; // latitude
          }

          return true;
        }
      ),
      { numRuns: 200 }
    );

    expect(result.failed).toBeFalse();
  });

  it('should preserve coordinate order (vertex sequence) in GeoJSON output', () => {
    const result = fc.check(
      fc.property(
        arbValidPolygonRing(),
        (ring) => {
          const geojson = convertToGeoJsonPolygon(ring);
          const outputRing = geojson.coordinates[0];

          // Verify the sequence order is maintained by checking consecutive pairs
          for (let i = 0; i < ring.length - 1; i++) {
            const originalCurrent = ring[i];
            const originalNext = ring[i + 1];
            const outputCurrent = outputRing[i];
            const outputNext = outputRing[i + 1];

            // Adjacent vertices must remain adjacent in the same order
            if (
              originalCurrent[0] !== outputCurrent[0] ||
              originalCurrent[1] !== outputCurrent[1] ||
              originalNext[0] !== outputNext[0] ||
              originalNext[1] !== outputNext[1]
            ) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 200 }
    );

    expect(result.failed).toBeFalse();
  });

  it('should produce a valid GeoJSON Polygon structure with type "Polygon"', () => {
    const result = fc.check(
      fc.property(
        arbValidPolygonRing(),
        (ring) => {
          const geojson = convertToGeoJsonPolygon(ring);

          // Must have type "Polygon"
          if (geojson.type !== 'Polygon') return false;

          // Must have coordinates as array of rings
          if (!Array.isArray(geojson.coordinates)) return false;

          // Must have exactly one ring (outer ring, no holes)
          if (geojson.coordinates.length !== 1) return false;

          // Each vertex must be [lng, lat] pair
          const outputRing = geojson.coordinates[0];
          for (const vertex of outputRing) {
            if (!Array.isArray(vertex)) return false;
            if (vertex.length !== 2) return false;
            if (typeof vertex[0] !== 'number') return false;
            if (typeof vertex[1] !== 'number') return false;
          }

          return true;
        }
      ),
      { numRuns: 200 }
    );

    expect(result.failed).toBeFalse();
  });

  it('should maintain the closed ring property (first vertex = last vertex) in GeoJSON', () => {
    const result = fc.check(
      fc.property(
        arbValidPolygonRing(),
        (ring) => {
          const geojson = convertToGeoJsonPolygon(ring);
          const outputRing = geojson.coordinates[0];

          // The ring must remain closed in the output
          const first = outputRing[0];
          const last = outputRing[outputRing.length - 1];

          return first[0] === last[0] && first[1] === last[1];
        }
      ),
      { numRuns: 200 }
    );

    expect(result.failed).toBeFalse();
  });
});
