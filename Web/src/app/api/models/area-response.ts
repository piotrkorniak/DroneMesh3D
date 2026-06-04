/**
 * DroneMesh3D API
 * Auto-generated stub — will be replaced by openapi-generator output.
 * Run `npm run api:generate` with the backend running to regenerate.
 */
export interface GeoJsonGeometry {
  type: string;
  coordinates: number[][][];
}

export interface AreaResponse {
  id: string;
  createdAt: string;
  geometry: GeoJsonGeometry;
}
