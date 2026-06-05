# Requirements Document

## Introduction

Pełna integracja frontendowej aplikacji Angular (DroneMesh3D Web) z istniejącym backendem .NET. Aktualnie frontend obsługuje jedynie tworzenie i pobieranie pojedynczego obszaru. Celem jest dodanie brakujących serwisów i modeli TypeScript obejmujących: listowanie obszarów, pełne zarządzanie planami lotów (obliczanie trasy, pobieranie planu, listowanie planów) oraz eksport plików misji w formatach LitchiCsv, Kml i DjiWpml. Dodatkowo backend wymaga rozszerzenia o endpointy LIST dla obszarów i planów lotów.

## Glossary

- **Frontend**: Aplikacja Angular (DroneMesh3D Web) działająca w przeglądarce
- **Backend**: Serwer .NET (DroneMesh3D Api) udostępniający REST API
- **Area**: Obszar geograficzny zdefiniowany jako polygon GeoJSON
- **Flight_Plan**: Plan lotu drona wygenerowany dla danego obszaru, zawierający waypointy i statystyki
- **Waypoint**: Pojedynczy punkt trasy lotu z koordynatami, wysokością i parametrami gimbala
- **Flight_Statistics**: Statystyki planu lotu (dystans, czas, liczba zdjęć, pokryty obszar)
- **Mission_File**: Plik eksportu planu lotu w formacie kompatybilnym z oprogramowaniem drona
- **Export_Format**: Format pliku misji — LitchiCsv, Kml lub DjiWpml
- **Flight_Mode**: Tryb lotu — Grid (siatka) lub Poi (punkt zainteresowania)
- **Grid_Parameters**: Parametry lotu w trybie Grid (wysokość, kamera, nakładki, kierunek)
- **Poi_Parameters**: Parametry lotu w trybie POI (centrum, promień, wysokość, gimbal)
- **Camera_Parameters**: Parametry sensora kamery (szerokość sensora, ogniskowa, rozdzielczość)
- **AreasApiService**: Serwis Angular odpowiedzialny za komunikację z endpointami /api/areas
- **FlightPlansApiService**: Serwis Angular odpowiedzialny za komunikację z endpointami /api/flight-plans
- **HttpClient**: Angularowy klient HTTP do wykonywania żądań REST

## Requirements

### Requirement 1: Modele TypeScript dla planów lotów

**User Story:** Jako deweloper frontendowy, chcę mieć kompletne interfejsy TypeScript odpowiadające DTO backendu, żeby bezpiecznie typować dane przesyłane między frontendem a backendem.

#### Acceptance Criteria

1. THE Frontend SHALL define a `FlightPlanResponse` interface with fields: id (string), areaId (string), mode (string), waypoints (WaypointDto[]), statistics (FlightStatisticsDto), createdAt (string)
2. THE Frontend SHALL define a `WaypointDto` interface with fields: latitude (number), longitude (number), altitudeAglM (number), gimbalPitchDegrees (number), gimbalYawDegrees (number)
3. THE Frontend SHALL define a `FlightStatisticsDto` interface with fields: totalDistanceM (number), estimatedFlightTimeS (number), photoCount (number), coveredAreaM2 (number)
4. THE Frontend SHALL define a `CalculateFlightPathRequest` interface with fields: areaId (string), mode (FlightMode), grid (GridModeParametersDto | null), poi (PoiModeParametersDto | null)
5. THE Frontend SHALL define a `GridModeParametersDto` interface with fields: altitudeM (number), camera (CameraParametersDto), frontOverlapPercent (number), sideOverlapPercent (number), headingDegrees (number | null)
6. THE Frontend SHALL define a `CameraParametersDto` interface with fields: sensorWidthMm (number), focalLengthMm (number), imageWidthPx (number), imageHeightPx (number)
7. THE Frontend SHALL define a `PoiModeParametersDto` interface with fields: centerLatitude (number), centerLongitude (number), radiusM (number), altitudeM (number), gimbalPitchDegrees (number), photoCount (number | null), overlapPercent (number | null), cameraHorizontalFovDegrees (number | null), structureHeightM (number | null)
8. THE Frontend SHALL define a `FlightMode` type as a string literal union with values 'Grid' and 'Poi'
9. THE Frontend SHALL define an `ExportFormat` type as a string literal union with values 'LitchiCsv', 'Kml' and 'DjiWpml'
10. THE Frontend SHALL export all defined interfaces and types from the `app/api/models/index.ts` barrel file
11. THE Frontend SHALL place each model definition in a separate file within the `app/api/models/` directory, following the existing kebab-case naming convention (e.g., `flight-plan-response.ts`)

### Requirement 2: Serwis API planów lotów

**User Story:** Jako deweloper frontendowy, chcę mieć serwis Angular do komunikacji z endpointami planów lotów, żeby móc obliczać trasy, pobierać plany i eksportować pliki misji.

#### Acceptance Criteria

1. THE FlightPlansApiService SHALL send a POST request to /api/flight-plans with a CalculateFlightPathRequest body and return an Observable of FlightPlanResponse
2. THE FlightPlansApiService SHALL send a GET request to /api/flight-plans/{id} where id is a string representation of a GUID, and return an Observable of FlightPlanResponse
3. THE FlightPlansApiService SHALL send a GET request to /api/flight-plans/{id}/export with a format query parameter whose value is one of "LitchiCsv", "Kml", or "DjiWpml", configure the HTTP request with responseType 'blob', and return an Observable of Blob for file download
4. IF the backend returns an HTTP error response, THEN THE FlightPlansApiService SHALL propagate the HttpErrorResponse through the Observable stream as an error notification without catching, wrapping, or mapping it to a different type
5. THE FlightPlansApiService SHALL use inject(HttpClient) and define a basePath set to '/api/flight-plans' following the same structural pattern as AreasApiService

### Requirement 3: Rozszerzenie serwisu API obszarów

**User Story:** Jako deweloper frontendowy, chcę mieć możliwość listowania wszystkich obszarów, żeby wyświetlać użytkownikowi listę wcześniej utworzonych obszarów.

#### Acceptance Criteria

1. THE AreasApiService SHALL send a GET request to /api/areas and return an Observable of AreaResponse array
2. WHEN the GET /api/areas endpoint is called, THE Backend SHALL return all stored areas as an AreaResponse array with HTTP 200 status, ordered by CreatedAt descending
3. IF no areas exist, THEN THE Backend SHALL return an empty array with HTTP 200 status
4. IF the Backend returns a non-success HTTP status in response to listAreas request, THEN THE AreasApiService SHALL propagate the error to the caller via the Observable error channel

### Requirement 4: Listowanie planów lotów

**User Story:** Jako deweloper frontendowy, chcę mieć możliwość listowania planów lotów dla danego obszaru, żeby wyświetlać historię wygenerowanych tras.

#### Acceptance Criteria

1. THE FlightPlansApiService SHALL send a GET request to /api/flight-plans with an optional areaId query parameter and return an Observable of FlightPlanResponse array
2. THE Backend SHALL expose a GET /api/flight-plans endpoint that returns a list of flight plans ordered by CreatedAt descending (newest first), limited to a maximum of 100 items, optionally filtered by areaId query parameter
3. WHEN a valid areaId parameter is provided, THE Backend SHALL return only flight plans associated with the specified area
4. WHEN no flight plans match the criteria, THE Backend SHALL return an empty array with HTTP 200 status
5. IF the areaId query parameter is provided but is not a valid GUID format, THEN THE Backend SHALL return HTTP 400 with an error message indicating the invalid parameter format

### Requirement 5: Eksport i pobieranie pliku misji

**User Story:** Jako użytkownik, chcę pobrać plik misji w wybranym formacie (LitchiCsv, Kml, DjiWpml), żeby załadować trasę do oprogramowania drona.

#### Acceptance Criteria

1. WHEN the user requests a mission file export, THE FlightPlansApiService SHALL send a GET request to /api/flight-plans/{id}/export with the format query parameter set to one of: LitchiCsv, Kml, DjiWpml
2. WHEN the export response is received with HTTP 200, THE Frontend SHALL trigger a browser file download using the Blob response body and the filename extracted from the Content-Disposition response header
3. THE Frontend SHALL support all three export formats: LitchiCsv, Kml, DjiWpml, selectable by the user before initiating the export
4. IF the export request returns HTTP 404, THEN THE FlightPlansApiService SHALL reject the observable (or propagate the error) so that the calling component can display an error message indicating the flight plan was not found
5. IF the export request returns HTTP 422 with a ValidationErrorResponse, THEN THE FlightPlansApiService SHALL reject the observable (or propagate the error) so that the calling component can display the validation error messages returned in the response body
6. IF the export request fails due to a network error or returns an unexpected HTTP error status, THEN THE Frontend SHALL display an error message indicating the export failed

### Requirement 6: Obsługa błędów API

**User Story:** Jako deweloper frontendowy, chcę mieć spójną obsługę błędów HTTP z backendu, żeby wyświetlać użytkownikowi zrozumiałe komunikaty o problemach.

#### Acceptance Criteria

1. THE Frontend SHALL reuse the existing ErrorResponse and ValidationErrorResponse interfaces for all API error handling
2. WHEN the Backend returns HTTP 404, THE Frontend SHALL propagate an ErrorResponse with a message indicating that the requested resource was not found through the Observable error stream
3. WHEN the Backend returns HTTP 422, THE Frontend SHALL parse the response body as a ValidationErrorResponse and propagate it through the Observable error stream, preserving the list of validation error strings and the message field
4. WHEN the Backend returns HTTP 500, THE Frontend SHALL propagate an ErrorResponse through the Observable error stream with a message indicating an internal server error, without exposing backend exception details
5. IF a network error occurs (HTTP status 0 or request timeout), THEN THE Frontend SHALL propagate an ErrorResponse through the Observable error stream with a message indicating that the server is unreachable or the connection failed
6. IF the Backend returns an HTTP error status code not explicitly handled (codes other than 404, 422, 500), THEN THE Frontend SHALL propagate an ErrorResponse through the Observable error stream with the message field from the response body if parseable as ErrorResponse, or a fallback message indicating an unexpected error with the numeric status code

### Requirement 7: Backend — endpoint listowania obszarów

**User Story:** Jako system, chcę udostępniać endpoint GET /api/areas zwracający wszystkie obszary, żeby frontend mógł wyświetlać listę obszarów.

#### Acceptance Criteria

1. THE Backend SHALL expose a GET /api/areas endpoint that returns HTTP 200 with a JSON array of AreaResponse objects, where each object contains Id (Guid), CreatedAt (DateTimeOffset), and Geometry (GeoJsonGeometry)
2. THE Backend SHALL return all stored areas ordered by CreatedAt descending
3. IF the data store contains no areas, THEN THE Backend SHALL return HTTP 200 with an empty JSON array (`[]`)
4. IF the data store is unreachable when handling a GET /api/areas request, THEN THE Backend SHALL return HTTP 500 with a JSON error response indicating a data store failure

### Requirement 8: Backend — endpoint listowania planów lotów

**User Story:** Jako system, chcę udostępniać endpoint GET /api/flight-plans zwracający plany lotów, żeby frontend mógł wyświetlać historię wygenerowanych tras.

#### Acceptance Criteria

1. THE Backend SHALL expose a GET /api/flight-plans endpoint returning HTTP 200 with a JSON array of FlightPlanResponse objects as the response body
2. WHERE the areaId query parameter is provided, THE Backend SHALL filter results to include only flight plans for the specified area
3. THE Backend SHALL return results ordered by CreatedAt descending, limited to a maximum of 100 items per response
4. WHEN no flight plans match the filter, THE Backend SHALL return an empty JSON array with HTTP 200
5. IF the provided areaId is not a valid GUID format, THEN THE Backend SHALL return HTTP 422 with a ValidationErrorResponse containing an error message indicating the invalid format
6. THE Backend SHALL accept optional query parameters "limit" (integer, 1–100, default 100) and "offset" (integer, minimum 0, default 0) for pagination of results
