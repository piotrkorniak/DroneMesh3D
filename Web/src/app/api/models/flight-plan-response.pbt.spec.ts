import * as fc from 'fast-check';
import { FlightPlanResponse } from './flight-plan-response';
import { WaypointDto } from './waypoint-dto';
import { FlightStatisticsDto } from './flight-statistics-dto';

/**
 * Property-Based Tests for FlightPlanResponse Serialization Round-Trip
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * Feature: frontend-api-integration, Property 1: FlightPlanResponse serialization round-trip
 *
 * For any valid FlightPlanResponse object (with arbitrary waypoints, statistics, id, areaId,
 * mode, and createdAt values), serializing it to JSON and deserializing it back should produce
 * an object with all fields equal to the original.
 */
describe('Feature: frontend-api-integration, Property 1: FlightPlanResponse serialization round-trip', () => {

  /**
   * Generates an arbitrary WaypointDto with finite numeric values.
   */
  function arbWaypointDto(): fc.Arbitrary<WaypointDto> {
    return fc.record({
      latitude: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
      altitudeAglM: fc.double({ min: 0, max: 10000, noNaN: true, noDefaultInfinity: true }),
      gimbalPitchDegrees: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
      gimbalYawDegrees: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    });
  }

  /**
   * Generates an arbitrary FlightStatisticsDto with finite numeric values.
   */
  function arbFlightStatisticsDto(): fc.Arbitrary<FlightStatisticsDto> {
    return fc.record({
      totalDistanceM: fc.double({ min: 0, max: 100000, noNaN: true, noDefaultInfinity: true }),
      estimatedFlightTimeS: fc.double({ min: 0, max: 36000, noNaN: true, noDefaultInfinity: true }),
      photoCount: fc.nat({ max: 10000 }),
      coveredAreaM2: fc.double({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true }),
    });
  }

  /**
   * Generates an arbitrary FlightPlanResponse with valid field values.
   */
  function arbFlightPlanResponse(): fc.Arbitrary<FlightPlanResponse> {
    return fc.record({
      id: fc.uuid(),
      areaId: fc.uuid(),
      mode: fc.constantFrom('Grid', 'Poi'),
      waypoints: fc.array(arbWaypointDto(), { minLength: 0, maxLength: 50 }),
      statistics: arbFlightStatisticsDto(),
      createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
        .map(ts => new Date(ts).toISOString()),
    });
  }

  // **Validates: Requirements 1.1, 1.2, 1.3**

  it('should preserve all fields after JSON serialize/deserialize round-trip', () => {
    const result = fc.check(
      fc.property(
        arbFlightPlanResponse(),
        (original) => {
          const serialized = JSON.stringify(original);
          const deserialized: FlightPlanResponse = JSON.parse(serialized);

          // Verify top-level fields
          if (deserialized.id !== original.id) return false;
          if (deserialized.areaId !== original.areaId) return false;
          if (deserialized.mode !== original.mode) return false;
          if (deserialized.createdAt !== original.createdAt) return false;

          // Verify statistics
          if (deserialized.statistics.totalDistanceM !== original.statistics.totalDistanceM) return false;
          if (deserialized.statistics.estimatedFlightTimeS !== original.statistics.estimatedFlightTimeS) return false;
          if (deserialized.statistics.photoCount !== original.statistics.photoCount) return false;
          if (deserialized.statistics.coveredAreaM2 !== original.statistics.coveredAreaM2) return false;

          // Verify waypoints array length
          if (deserialized.waypoints.length !== original.waypoints.length) return false;

          // Verify each waypoint
          for (let i = 0; i < original.waypoints.length; i++) {
            const origWp = original.waypoints[i];
            const deserWp = deserialized.waypoints[i];
            if (deserWp.latitude !== origWp.latitude) return false;
            if (deserWp.longitude !== origWp.longitude) return false;
            if (deserWp.altitudeAglM !== origWp.altitudeAglM) return false;
            if (deserWp.gimbalPitchDegrees !== origWp.gimbalPitchDegrees) return false;
            if (deserWp.gimbalYawDegrees !== origWp.gimbalYawDegrees) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });
});
