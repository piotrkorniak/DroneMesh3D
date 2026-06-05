/**
 * DroneMesh3D API
 * Auto-generated stub — will be replaced by openapi-generator output.
 * Run `npm run api:generate` with the backend running to regenerate.
 */
export interface PoiModeParametersDto {
  centerLatitude: number;
  centerLongitude: number;
  radiusM: number;
  altitudeM: number;
  gimbalPitchDegrees: number;
  photoCount: number | null;
  overlapPercent: number | null;
  cameraHorizontalFovDegrees: number | null;
  structureHeightM: number | null;
}
