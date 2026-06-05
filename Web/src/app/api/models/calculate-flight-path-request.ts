/**
 * DroneMesh3D API
 * Auto-generated stub — will be replaced by openapi-generator output.
 * Run `npm run api:generate` with the backend running to regenerate.
 */
import { FlightMode } from './flight-mode';
import { GridModeParametersDto } from './grid-mode-parameters-dto';
import { PoiModeParametersDto } from './poi-mode-parameters-dto';

export interface CalculateFlightPathRequest {
  areaId: string;
  mode: FlightMode;
  grid: GridModeParametersDto | null;
  poi: PoiModeParametersDto | null;
}
