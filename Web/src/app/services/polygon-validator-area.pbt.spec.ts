import * as fc from 'fast-check';
import { PolygonValidatorService } from './polygon-validator.service';
import { ValidationRule } from '../models/validation';

/**
 * Property-Based Tests for Area Limits Validation
 *
 * **Validates: Requirements 3.4, 3.5**
 *
 * Property 4: Walidacja limitów powierzchni
 * - Polygons with area > 50,000 m² → AREA_TOO_LARGE error
 * - Polygons with area < 100 m² → AREA_TOO_SMALL error
 * - Polygons with area in [100, 50,000] m² → no area-related error
 *
 * Strategy: Use rectangles at latitude ~52°N with calculated side lengths.
 * The service uses a spherical area formula which differs slightly from flat
 * area (width × height). To avoid boundary precision issues, we use generous
 * margins away from the thresholds and verify using the service's own
 * calculateAreaSqm method as the ground truth for area computation.
 */
describe('PolygonValidatorService - Property 4: Area Limits', () => {
  let service: PolygonValidatorService;

  const BASE_LAT = 52.0; // latitude ~52°N (Warsaw area)
  const BASE_LON = 20.0; // longitude ~20°E

  // Conversion factors at latitude 52°N
  const METERS_PER_DEG_LAT = 111_320;
  const METERS_PER_DEG_LON = Math.cos((52 * Math.PI) / 180) * 111_320; // ≈ 68,549

  const MAX_AREA_SQM = 50_000; // 5 hectares
  const MIN_AREA_SQM = 100;

  beforeEach(() => {
    service = new PolygonValidatorService();
  });

  /**
   * Creates a closed rectangle polygon given width and height in meters.
   * The rectangle is positioned at BASE_LON, BASE_LAT.
   * Returns coordinates as [longitude, latitude] pairs (GeoJSON order).
   */
  function makeRectangle(widthMeters: number, heightMeters: number): number[][] {
    const dLon = widthMeters / METERS_PER_DEG_LON;
    const dLat = heightMeters / METERS_PER_DEG_LAT;

    return [
      [BASE_LON, BASE_LAT],
      [BASE_LON + dLon, BASE_LAT],
      [BASE_LON + dLon, BASE_LAT + dLat],
      [BASE_LON, BASE_LAT + dLat],
      [BASE_LON, BASE_LAT], // closed
    ];
  }

  /**
   * Generates rectangle dimensions (width, height in meters) such that
   * the service's spherical area calculation exceeds MAX_AREA_SQM (50,000 m²).
   *
   * We use a scale factor to generate rectangles whose flat area is well above
   * the threshold, ensuring the spherical area is also above threshold.
   */
  function arbRectangleTooLarge(): fc.Arbitrary<number[][]> {
    // Generate side lengths where the product (flat area) is well above 50,000
    // Use side in range [250, 1000] m per side → area range [62,500, 1,000,000]
    return fc.tuple(
      fc.double({ min: 250, max: 1000, noNaN: true }),
      fc.double({ min: 250, max: 1000, noNaN: true })
    ).filter(([w, h]) => w * h > 60_000) // flat area well above threshold
      .map(([w, h]) => makeRectangle(w, h));
  }

  /**
   * Generates rectangle dimensions such that the service's spherical area
   * calculation is below MIN_AREA_SQM (100 m²).
   *
   * We use small side lengths where the product is well below 100.
   */
  function arbRectangleTooSmall(): fc.Arbitrary<number[][]> {
    // Generate side lengths where the product (flat area) is well below 100
    // Use side in range [1, 8] m → area range [1, 64]
    return fc.tuple(
      fc.double({ min: 1, max: 8, noNaN: true }),
      fc.double({ min: 1, max: 8, noNaN: true })
    ).filter(([w, h]) => w * h < 80) // flat area well below threshold
      .map(([w, h]) => makeRectangle(w, h));
  }

  /**
   * Generates rectangle dimensions such that the service's spherical area
   * is within the valid range [100, 50,000] m².
   *
   * We generate rectangles whose flat area is comfortably within the bounds,
   * then verify with the service's own calculation.
   */
  function arbRectangleValid(): fc.Arbitrary<number[][]> {
    // Generate side lengths for areas in a safe interior range [200, 40,000]
    // to avoid boundary precision issues with the spherical formula
    return fc.tuple(
      fc.double({ min: 10, max: 200, noNaN: true }),
      fc.double({ min: 10, max: 200, noNaN: true })
    ).filter(([w, h]) => {
      const flatArea = w * h;
      return flatArea >= 200 && flatArea <= 40_000;
    }).map(([w, h]) => makeRectangle(w, h));
  }

  // **Validates: Requirements 3.4, 3.5**

  it('should produce AREA_TOO_LARGE error for polygons with area > 50,000 m²', () => {
    const result = fc.check(
      fc.property(
        arbRectangleTooLarge(),
        (coords) => {
          // Confirm the service calculates area > threshold
          const computedArea = service.calculateAreaSqm(coords);
          if (computedArea <= MAX_AREA_SQM) {
            // Skip this sample if spherical area happens to be within bounds
            return true;
          }

          const validationResult = service.validate(coords);
          const hasAreaTooLarge = validationResult.errors.some(
            e => e.rule === ValidationRule.AreaTooLarge
          );

          return hasAreaTooLarge;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });

  it('should produce AREA_TOO_SMALL error for polygons with area < 100 m²', () => {
    const result = fc.check(
      fc.property(
        arbRectangleTooSmall(),
        (coords) => {
          // Confirm the service calculates area < threshold
          const computedArea = service.calculateAreaSqm(coords);
          if (computedArea >= MIN_AREA_SQM) {
            // Skip this sample if spherical area happens to be within bounds
            return true;
          }

          const validationResult = service.validate(coords);
          const hasAreaTooSmall = validationResult.errors.some(
            e => e.rule === ValidationRule.AreaTooSmall
          );

          return hasAreaTooSmall;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });

  it('should NOT produce any area-related error for polygons with area in [100, 50,000] m²', () => {
    const result = fc.check(
      fc.property(
        arbRectangleValid(),
        (coords) => {
          // Confirm the service calculates area within valid bounds
          const computedArea = service.calculateAreaSqm(coords);
          if (computedArea < MIN_AREA_SQM || computedArea > MAX_AREA_SQM) {
            // Skip this sample if spherical area is outside bounds
            return true;
          }

          const validationResult = service.validate(coords);
          const hasAreaTooLarge = validationResult.errors.some(
            e => e.rule === ValidationRule.AreaTooLarge
          );
          const hasAreaTooSmall = validationResult.errors.some(
            e => e.rule === ValidationRule.AreaTooSmall
          );

          return !hasAreaTooLarge && !hasAreaTooSmall;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });
});
