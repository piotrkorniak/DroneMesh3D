/**
 * DroneMesh3D API
 * Auto-generated stub — will be replaced by openapi-generator output.
 * Run `npm run api:generate` with the backend running to regenerate.
 */
import { WaypointDto } from './waypoint-dto';
import { FlightStatisticsDto } from './flight-statistics-dto';

export interface FlightPlanResponse {
  id: string;
  areaId: string;
  mode: string;
  waypoints: WaypointDto[];
  statistics: FlightStatisticsDto;
  createdAt: string;
}
