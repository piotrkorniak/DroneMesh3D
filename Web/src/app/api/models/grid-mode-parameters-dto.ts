/**
 * DroneMesh3D API
 * Auto-generated stub — will be replaced by openapi-generator output.
 * Run `npm run api:generate` with the backend running to regenerate.
 */
import { CameraParametersDto } from './camera-parameters-dto';

export interface GridModeParametersDto {
  altitudeM: number;
  camera: CameraParametersDto;
  frontOverlapPercent: number;
  sideOverlapPercent: number;
  headingDegrees: number | null;
}
