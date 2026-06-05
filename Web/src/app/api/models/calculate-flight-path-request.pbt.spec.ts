import * as fc from 'fast-check';
import { CalculateFlightPathRequest } from './calculate-flight-path-request';
import { GridModeParametersDto } from './grid-mode-parameters-dto';
import { PoiModeParametersDto } from './poi-mode-parameters-dto';
import { CameraParametersDto } from './camera-parameters-dto';
import { FlightMode } from './flight-mode';

/**
 * Property-Based Tests for CalculateFlightPathRequest Serialization Round-Trip
 * **Validates: Requirements 1.4, 1.5, 1.6, 1.7**
 *
 * Feature: frontend-api-integration
 * Property 2: CalculateFlightPathRequest serialization round-trip
 *
 * For any valid CalculateFlightPathRequest object (with either Grid or Poi parameters,
 * including null variants), serializing it to JSON and deserializing it back should
 * produce an object with all fields equal to the original.
 */
describe('Feature: frontend-api-integration, Property 2: CalculateFlightPathRequest serialization round-trip', () => {
  /**
   * Generator: CameraParametersDto with finite positive numbers
   */
  const cameraParametersArb = (): fc.Arbitrary<CameraParametersDto> => {
    return fc.record({
      sensorWidthMm: fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
      focalLengthMm: fc.double({ min: 0.1, max: 500, noNaN: true, noDefaultInfinity: true }),
      imageWidthPx: fc.integer({ min: 1, max: 20000 }),
      imageHeightPx: fc.integer({ min: 1, max: 20000 }),
    });
  };

  /**
   * Generator: GridModeParametersDto with valid numeric ranges
   */
  const gridModeParametersArb = (): fc.Arbitrary<GridModeParametersDto> => {
    return fc.record({
      altitudeM: fc.double({ min: 1, max: 500, noNaN: true, noDefaultInfinity: true }),
      camera: cameraParametersArb(),
      frontOverlapPercent: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
      sideOverlapPercent: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
      headingDegrees: fc.oneof(
        fc.constant(null),
        fc.double({ min: 0, max: 360, noNaN: true, noDefaultInfinity: true })
      ),
    });
  };

  /**
   * Generator: PoiModeParametersDto with valid numeric ranges
   */
  const poiModeParametersArb = (): fc.Arbitrary<PoiModeParametersDto> => {
    return fc.record({
      centerLatitude: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
      centerLongitude: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
      radiusM: fc.double({ min: 1, max: 10000, noNaN: true, noDefaultInfinity: true }),
      altitudeM: fc.double({ min: 1, max: 500, noNaN: true, noDefaultInfinity: true }),
      gimbalPitchDegrees: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
      photoCount: fc.oneof(
        fc.constant(null),
        fc.integer({ min: 1, max: 1000 })
      ),
      overlapPercent: fc.oneof(
        fc.constant(null),
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
      ),
      cameraHorizontalFovDegrees: fc.oneof(
        fc.constant(null),
        fc.double({ min: 1, max: 180, noNaN: true, noDefaultInfinity: true })
      ),
      structureHeightM: fc.oneof(
        fc.constant(null),
        fc.double({ min: 0.1, max: 1000, noNaN: true, noDefaultInfinity: true })
      ),
    });
  };

  /**
   * Generator: CalculateFlightPathRequest in Grid mode (poi = null)
   */
  const gridModeRequestArb = (): fc.Arbitrary<CalculateFlightPathRequest> => {
    return fc.record({
      areaId: fc.uuid(),
      mode: fc.constant('Grid' as FlightMode),
      grid: gridModeParametersArb(),
      poi: fc.constant(null),
    });
  };

  /**
   * Generator: CalculateFlightPathRequest in Poi mode (grid = null)
   */
  const poiModeRequestArb = (): fc.Arbitrary<CalculateFlightPathRequest> => {
    return fc.record({
      areaId: fc.uuid(),
      mode: fc.constant('Poi' as FlightMode),
      grid: fc.constant(null),
      poi: poiModeParametersArb(),
    });
  };

  /**
   * Generator: CalculateFlightPathRequest with either Grid or Poi mode
   */
  const calculateFlightPathRequestArb = (): fc.Arbitrary<CalculateFlightPathRequest> => {
    return fc.oneof(gridModeRequestArb(), poiModeRequestArb());
  };

  describe('Grid mode requests survive JSON serialization round-trip', () => {
    it('serializing and deserializing a Grid mode request preserves all fields', () => {
      const property = fc.property(gridModeRequestArb(), (request: CalculateFlightPathRequest) => {
        const serialized = JSON.stringify(request);
        const deserialized: CalculateFlightPathRequest = JSON.parse(serialized);

        expect(deserialized.areaId).toBe(request.areaId);
        expect(deserialized.mode).toBe('Grid');
        expect(deserialized.poi).toBeNull();
        expect(deserialized.grid).not.toBeNull();
        expect(deserialized.grid!.altitudeM).toBe(request.grid!.altitudeM);
        expect(deserialized.grid!.frontOverlapPercent).toBe(request.grid!.frontOverlapPercent);
        expect(deserialized.grid!.sideOverlapPercent).toBe(request.grid!.sideOverlapPercent);
        expect(deserialized.grid!.headingDegrees).toBe(request.grid!.headingDegrees);
        expect(deserialized.grid!.camera.sensorWidthMm).toBe(request.grid!.camera.sensorWidthMm);
        expect(deserialized.grid!.camera.focalLengthMm).toBe(request.grid!.camera.focalLengthMm);
        expect(deserialized.grid!.camera.imageWidthPx).toBe(request.grid!.camera.imageWidthPx);
        expect(deserialized.grid!.camera.imageHeightPx).toBe(request.grid!.camera.imageHeightPx);
      });

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });

  describe('Poi mode requests survive JSON serialization round-trip', () => {
    it('serializing and deserializing a Poi mode request preserves all fields', () => {
      const property = fc.property(poiModeRequestArb(), (request: CalculateFlightPathRequest) => {
        const serialized = JSON.stringify(request);
        const deserialized: CalculateFlightPathRequest = JSON.parse(serialized);

        expect(deserialized.areaId).toBe(request.areaId);
        expect(deserialized.mode).toBe('Poi');
        expect(deserialized.grid).toBeNull();
        expect(deserialized.poi).not.toBeNull();
        expect(deserialized.poi!.centerLatitude).toBe(request.poi!.centerLatitude);
        expect(deserialized.poi!.centerLongitude).toBe(request.poi!.centerLongitude);
        expect(deserialized.poi!.radiusM).toBe(request.poi!.radiusM);
        expect(deserialized.poi!.altitudeM).toBe(request.poi!.altitudeM);
        expect(deserialized.poi!.gimbalPitchDegrees).toBe(request.poi!.gimbalPitchDegrees);
        expect(deserialized.poi!.photoCount).toBe(request.poi!.photoCount);
        expect(deserialized.poi!.overlapPercent).toBe(request.poi!.overlapPercent);
        expect(deserialized.poi!.cameraHorizontalFovDegrees).toBe(request.poi!.cameraHorizontalFovDegrees);
        expect(deserialized.poi!.structureHeightM).toBe(request.poi!.structureHeightM);
      });

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });

  describe('Mixed mode requests survive JSON serialization round-trip', () => {
    it('serializing and deserializing any CalculateFlightPathRequest preserves deep equality', () => {
      const property = fc.property(calculateFlightPathRequestArb(), (request: CalculateFlightPathRequest) => {
        const serialized = JSON.stringify(request);
        const deserialized: CalculateFlightPathRequest = JSON.parse(serialized);

        expect(deserialized).toEqual(request);
      });

      expect(() => fc.assert(property, { numRuns: 100 })).not.toThrow();
    });
  });
});
