# Implementation Plan: Frontend API Integration

## Overview

This plan implements the full integration between the Angular frontend and the .NET backend for DroneMesh3D. It covers TypeScript model interfaces, new API services, file download utilities, error handling utilities, backend LIST endpoints with MediatR CQRS, and property-based/unit/integration tests. Each task builds incrementally, wiring components together at the end.

## Tasks

- [x] 1. Define TypeScript model interfaces
  - [x] 1.1 Create flight plan model interfaces
    - Create `Web/src/app/api/models/flight-mode.ts` exporting `FlightMode` type (`'Grid' | 'Poi'`)
    - Create `Web/src/app/api/models/export-format.ts` exporting `ExportFormat` type (`'LitchiCsv' | 'Kml' | 'DjiWpml'`)
    - Create `Web/src/app/api/models/waypoint-dto.ts` with `WaypointDto` interface (latitude, longitude, altitudeAglM, gimbalPitchDegrees, gimbalYawDegrees)
    - Create `Web/src/app/api/models/flight-statistics-dto.ts` with `FlightStatisticsDto` interface (totalDistanceM, estimatedFlightTimeS, photoCount, coveredAreaM2)
    - Create `Web/src/app/api/models/camera-parameters-dto.ts` with `CameraParametersDto` interface (sensorWidthMm, focalLengthMm, imageWidthPx, imageHeightPx)
    - Create `Web/src/app/api/models/flight-plan-response.ts` with `FlightPlanResponse` interface (id, areaId, mode, waypoints, statistics, createdAt)
    - _Requirements: 1.1, 1.2, 1.3, 1.8, 1.9_

  - [x] 1.2 Create flight path request model interfaces
    - Create `Web/src/app/api/models/grid-mode-parameters-dto.ts` with `GridModeParametersDto` interface (altitudeM, camera, frontOverlapPercent, sideOverlapPercent, headingDegrees)
    - Create `Web/src/app/api/models/poi-mode-parameters-dto.ts` with `PoiModeParametersDto` interface (centerLatitude, centerLongitude, radiusM, altitudeM, gimbalPitchDegrees, photoCount, overlapPercent, cameraHorizontalFovDegrees, structureHeightM)
    - Create `Web/src/app/api/models/calculate-flight-path-request.ts` with `CalculateFlightPathRequest` interface (areaId, mode, grid, poi)
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

  - [x] 1.3 Update barrel exports
    - Update `Web/src/app/api/models/index.ts` to export all new interfaces and types: FlightPlanResponse, WaypointDto, FlightStatisticsDto, CalculateFlightPathRequest, GridModeParametersDto, CameraParametersDto, PoiModeParametersDto, FlightMode, ExportFormat
    - _Requirements: 1.10, 1.11_

- [x] 2. Implement frontend API services
  - [x] 2.1 Create FlightPlansApiService
    - Create `Web/src/app/api/services/flight-plans.service.ts`
    - Use `inject(HttpClient)` pattern matching `AreasApiService`
    - Implement `calculate(body: CalculateFlightPathRequest): Observable<FlightPlanResponse>` → POST /api/flight-plans
    - Implement `getById(id: string): Observable<FlightPlanResponse>` → GET /api/flight-plans/{id}
    - Implement `list(params?: { areaId?: string }): Observable<FlightPlanResponse[]>` → GET /api/flight-plans with optional areaId query param
    - Implement `exportMissionFile(id: string, format: ExportFormat): Observable<HttpResponse<Blob>>` → GET /api/flight-plans/{id}/export?format={format} with responseType 'blob' and observe 'response'
    - Let `HttpErrorResponse` propagate unchanged through Observable error channel (no interceptor, no catch)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1_

  - [x] 2.2 Extend AreasApiService with listAreas method
    - Add `listAreas(): Observable<AreaResponse[]>` method to existing `Web/src/app/api/services/areas.service.ts`
    - Implementation: `return this.http.get<AreaResponse[]>(`${this.basePath}/areas`)`
    - Error propagation via Observable error channel (no catch)
    - _Requirements: 3.1, 3.4_

- [x] 3. Implement frontend utilities
  - [x] 3.1 Create file download utility
    - Create `Web/src/app/api/utils/file-download.ts`
    - Implement `extractFilename(contentDisposition: string | null): string` — parse filename from Content-Disposition header (handles quoted/unquoted filenames)
    - Implement `triggerBlobDownload(response: HttpResponse<Blob>): void` — extract filename from response headers, create ObjectURL, trigger download via anchor click, revoke ObjectURL
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Create error handler utility
    - Create `Web/src/app/api/utils/error-handler.ts`
    - Implement `classifyApiError(error: HttpErrorResponse): ErrorResponse | ValidationErrorResponse` that classifies by HTTP status: 0 → "Server is unreachable", 422 with errors array → ValidationErrorResponse, 500 → generic message, other → use body message or fallback
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 4. Checkpoint - Frontend implementation verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement backend ListAreasQuery
  - [x] 5.1 Create ListAreasQuery and handler
    - Create `Api/Queries/ListAreasQuery.cs` as `public record ListAreasQuery() : IRequest<List<AreaResponse>>`
    - Create `Api/Handlers/ListAreasQueryHandler.cs` implementing `IRequestHandler<ListAreasQuery, List<AreaResponse>>`
    - Handler calls `IAreaRepository.GetAllAsync()`, maps entities to `AreaResponse` DTOs, returns ordered by CreatedAt descending
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 5.2 Extend IAreaRepository with GetAllAsync
    - Add `Task<List<AreaEntity>> GetAllAsync(CancellationToken ct = default)` to `Core/Interfaces/IAreaRepository.cs`
    - Implement `GetAllAsync` in the EF Core repository class, querying all areas ordered by CreatedAt descending
    - _Requirements: 7.1, 7.2_

  - [x] 5.3 Register GET /api/areas endpoint
    - Add `group.MapGet("/", ListAreas)` to `AreasEndpoint.cs` returning `List<AreaResponse>` with HTTP 200
    - Implement static `ListAreas` handler method sending `ListAreasQuery` through MediatR
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Implement backend ListFlightPlansQuery
  - [x] 6.1 Create ListFlightPlansQuery and handler
    - Create `Api/Queries/ListFlightPlansQuery.cs` as `public record ListFlightPlansQuery(Guid? AreaId, int Limit = 100, int Offset = 0) : IRequest<List<FlightPlanResponse>>`
    - Create `Api/Handlers/ListFlightPlansQueryHandler.cs` implementing `IRequestHandler<ListFlightPlansQuery, List<FlightPlanResponse>>`
    - Handler calls `IFlightPlanRepository.ListAsync(areaId, limit, offset)`, maps entities to DTOs
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

  - [x] 6.2 Extend IFlightPlanRepository with ListAsync
    - Add `Task<List<FlightPlanEntity>> ListAsync(Guid? areaId, int limit, int offset, CancellationToken ct = default)` to `Core/Interfaces/IFlightPlanRepository.cs`
    - Implement in EF Core repository: filter by areaId (if provided), order by CreatedAt descending, apply offset then limit
    - _Requirements: 8.2, 8.3, 8.6_

  - [x] 6.3 Register GET /api/flight-plans endpoint
    - Add `group.MapGet("/", ListFlightPlans)` to `FlightPlansEndpoint.cs`
    - Implement static `ListFlightPlans` method accepting optional `areaId`, `limit`, `offset` query parameters
    - Validate areaId format (if provided and not valid GUID → return 422 ValidationErrorResponse)
    - Clamp limit to 1–100 range, offset minimum 0
    - Send `ListFlightPlansQuery` through MediatR and return 200 with results
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 7. Checkpoint - Backend implementation verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Frontend property-based tests
  - [x] 8.1 Write property test for FlightPlanResponse serialization round-trip
    - Create `Web/src/app/api/models/flight-plan-response.pbt.spec.ts`
    - **Property 1: FlightPlanResponse serialization round-trip**
    - Generate arbitrary FlightPlanResponse objects with fast-check, serialize to JSON and deserialize back, assert deep equality
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 8.2 Write property test for CalculateFlightPathRequest serialization round-trip
    - Create `Web/src/app/api/models/calculate-flight-path-request.pbt.spec.ts`
    - **Property 2: CalculateFlightPathRequest serialization round-trip**
    - Generate arbitrary CalculateFlightPathRequest objects (Grid mode, Poi mode, null variants) with fast-check, serialize/deserialize, assert equality
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7**

  - [x] 8.3 Write property test for FlightPlansApiService HTTP request construction
    - Create `Web/src/app/api/services/flight-plans.service.pbt.spec.ts`
    - **Property 3: FlightPlansApiService constructs correct HTTP requests**
    - Use `HttpClientTestingModule`, generate arbitrary inputs with fast-check, verify correct method/URL/body/params for each service method
    - **Validates: Requirements 2.1, 2.2, 2.3, 4.1, 5.1**

  - [x] 8.4 Write property test for API error propagation
    - Add to `Web/src/app/api/services/flight-plans.service.pbt.spec.ts`
    - **Property 4: API services propagate HTTP errors unchanged**
    - Generate arbitrary HTTP error status codes with fast-check, verify both FlightPlansApiService and AreasApiService propagate HttpErrorResponse unchanged
    - **Validates: Requirements 2.4, 3.4, 5.4, 5.5**

  - [x] 8.5 Write property test for Content-Disposition filename extraction
    - Create `Web/src/app/api/utils/file-download.pbt.spec.ts`
    - **Property 9: Content-Disposition filename extraction**
    - Generate arbitrary valid Content-Disposition headers with filenames (quoted/unquoted, various characters) with fast-check, verify extractFilename returns the correct filename
    - **Validates: Requirements 5.2**

  - [x] 8.6 Write property test for ValidationErrorResponse parsing
    - Create `Web/src/app/api/utils/error-handler.pbt.spec.ts`
    - **Property 10: ValidationErrorResponse parsing preserves all fields**
    - Generate arbitrary ValidationErrorResponse JSON (any message string, any array of error strings) with fast-check, parse with classifyApiError, assert fields preserved
    - **Validates: Requirements 6.3**

- [x] 9. Frontend unit tests
  - [x] 9.1 Write unit tests for FlightPlansApiService
    - Create `Web/src/app/api/services/flight-plans.service.spec.ts`
    - Test `calculate` sends POST to /api/flight-plans with correct body
    - Test `getById` sends GET to /api/flight-plans/{id}
    - Test `list` sends GET to /api/flight-plans with optional areaId query param
    - Test `exportMissionFile` sends GET to /api/flight-plans/{id}/export?format={format} with blob responseType
    - Test all three export formats (LitchiCsv, Kml, DjiWpml)
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 5.1, 5.3_

  - [x] 9.2 Write unit tests for AreasApiService.listAreas
    - Create or extend `Web/src/app/api/services/areas.service.spec.ts`
    - Test `listAreas` sends GET to /api/areas and returns AreaResponse[]
    - _Requirements: 3.1_

  - [x] 9.3 Write unit tests for file-download and error-handler utilities
    - Create `Web/src/app/api/utils/file-download.spec.ts` — test extractFilename with various Content-Disposition formats, test triggerBlobDownload triggers download
    - Create `Web/src/app/api/utils/error-handler.spec.ts` — test classifyApiError for status 0, 404, 422, 500, and unexpected codes
    - _Requirements: 5.2, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 10. Backend integration tests
  - [x] 10.1 Write integration tests for GET /api/areas list endpoint
    - Add tests to `Tests/Api.Tests/Integration/AreasEndpointTests.cs`
    - Test returns empty array when no areas exist (HTTP 200)
    - Test returns all areas ordered by CreatedAt descending
    - Test response shape matches AreaResponse DTO contract
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 10.2 Write integration tests for GET /api/flight-plans list endpoint
    - Add tests to `Tests/Api.Tests/Integration/FlightPlansEndpointTests.cs`
    - Test filtering by valid areaId returns only matching flight plans
    - Test invalid GUID areaId returns HTTP 422 with ValidationErrorResponse
    - Test ordering by CreatedAt descending
    - Test pagination with limit and offset parameters
    - Test empty result returns HTTP 200 with empty array
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 11. Final checkpoint - Full verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–4, 9, 10)
- Backend properties 5–8 are covered by integration tests (task 10.2) with varied inputs
- Unit tests validate specific examples and edge cases
- Frontend uses TypeScript with Angular patterns (inject, HttpClient, Observable)
- Backend uses C# with .NET Minimal APIs, MediatR CQRS, and xUnit

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "5.2", "6.2"] },
    { "id": 2, "tasks": ["2.1", "2.2", "3.1", "3.2", "5.1", "6.1"] },
    { "id": 3, "tasks": ["5.3", "6.3"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.5", "8.6", "9.1", "9.2", "9.3"] },
    { "id": 5, "tasks": ["8.3", "8.4", "10.1", "10.2"] }
  ]
}
```
