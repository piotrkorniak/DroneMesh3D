# Implementation Plan: Mission File Generation

## Overview

Implement mission file export for DroneMesh3D, enabling FlightPlanEntity data to be exported as Litchi CSV, KML, and DJI WPML (KMZ) files. The implementation follows the project's established patterns: Strategy pattern for generators, MediatR query with OneOf return type, FluentValidation, and Minimal API endpoint. Tasks are ordered to build core abstractions first, then generators, then the MediatR pipeline, and finally the endpoint wiring.

## Tasks

- [x] 1. Define core interfaces, enums, and constants
  - [x] 1.1 Create ExportFormat enum and MissionConstants class
    - Create `Core/MissionExport/ExportFormat.cs` with enum values: LitchiCsv, Kml, DjiWpml
    - Create `Core/MissionExport/MissionConstants.cs` with all fixed values (MaxSpeedMs=15, LitchiGimbalMode=0, DjiTakeOffSecurityHeight=20, etc.)
    - _Requirements: 3.3, 3.4, 3.5, 5.3, 6.4_

  - [x] 1.2 Create IMissionFileGenerator interface and MissionFileData record
    - Create `Core/MissionExport/IMissionFileGenerator.cs` with `ExportFormat Format` property and `MissionFileData Generate(Guid flightPlanId, IReadOnlyList<Waypoint> waypoints)` method
    - Create `Core/MissionExport/MissionFileData.cs` sealed record with Content (byte[]), ContentType (string), FileName (string)
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 1.3 Create IMissionFileGeneratorFactory interface and implementation
    - Create `Core/MissionExport/IMissionFileGeneratorFactory.cs` with `IMissionFileGenerator GetGenerator(ExportFormat format)` method
    - Create `Core/MissionExport/MissionFileGeneratorFactory.cs` that resolves generators from DI-injected `IEnumerable<IMissionFileGenerator>` into a dictionary keyed by ExportFormat
    - _Requirements: 1.6_

- [x] 2. Implement Litchi CSV generator
  - [x] 2.1 Implement LitchiCsvGenerator
    - Create `Core/MissionExport/LitchiCsvGenerator.cs` implementing `IMissionFileGenerator`
    - Generate CSV header with columns: latitude, longitude, altitude(m), heading(deg), curvesize(m), rotationdir, gimbalmode, gimbalpitchangle, actiontype1, actionparam1, speed(m/s)
    - Map each waypoint to a data row with correct field mappings (heading=GimbalYawDegrees, gimbalpitchangle=GimbalPitchDegrees, fixed values from MissionConstants)
    - Output UTF-8 without BOM, comma separator
    - Set ContentType to `text/csv` and FileName to `mission_{id}.csv`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.2 Write property test: CSV round-trip preserves waypoint data
    - **Property 1: CSV round-trip preserves waypoint data**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 6.2, 7.3**

  - [x] 2.3 Write property test: CSV structural correctness
    - **Property 2: CSV structural correctness**
    - **Validates: Requirements 3.1, 3.6, 7.1**

- [x] 3. Implement KML generator
  - [x] 3.1 Implement KmlGenerator
    - Create `Core/MissionExport/KmlGenerator.cs` implementing `IMissionFileGenerator`
    - Generate KML 2.2 XML document with namespace `http://www.opengis.net/kml/2.2`
    - Add Document element with name `DroneMesh3D Mission - {flightPlanId}`
    - Add one Placemark per waypoint with Point (longitude,latitude,altitude order) and ExtendedData (gimbalPitch, gimbalYaw, action=TakePhoto, speed=15)
    - Output UTF-8 with XML declaration
    - Set ContentType to `application/vnd.google-earth.kml+xml` and FileName to `mission_{id}.kml`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.2 Write property test: KML round-trip structural validity
    - **Property 3: KML round-trip structural validity**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 7.2, 7.4**

- [x] 4. Implement DJI WPML (KMZ) generator
  - [x] 4.1 Implement DjiWpmlGenerator
    - Create `Core/MissionExport/DjiWpmlGenerator.cs` implementing `IMissionFileGenerator`
    - Generate ZIP archive (KMZ) containing `template.kml` and `waylines.wpml`
    - template.kml: dual namespace (KML 2.2 + WPML `http://www.dji.com/wpmz/1.0.2`), missionConfig with fixed values (flyToWaylineMode=safely, finishAction=goHome, exitOnRCLost=executeLostAction, executeRCLostAction=hover, takeOffSecurityHeight=20, globalTransitionalSpeed=15), folder with template metadata (templateType=waypoint, coordinateMode=WGS84, heightMode=relativeToStartPoint, autoFlightSpeed=15, gimbalPitchMode=usePointSetting), one Placemark per waypoint with coordinates, index, height, gimbalPitchAngle
    - waylines.wpml: one waypoint element per waypoint with action group containing takePhoto triggered by reachPoint
    - Output UTF-8 with XML declarations for both files
    - Set ContentType to `application/vnd.google-earth.kmz` and FileName to `mission_{id}.kmz`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.2 Write property test: KMZ structural round-trip
    - **Property 4: KMZ structural round-trip**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.5, 7.6**

- [x] 5. Checkpoint - Core generators complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement cross-generator property tests
  - [x] 6.1 Write property test: Waypoint order preservation
    - **Property 5: Waypoint order preservation**
    - **Validates: Requirements 6.1, 6.5**

  - [x] 6.2 Write property test: Invalid format rejection
    - **Property 6: Invalid format rejection**
    - **Validates: Requirements 2.2**

  - [x] 6.3 Create WaypointListArbitrary for FsCheck
    - Create `Tests/Core.Tests/MissionExport/WaypointListArbitrary.cs` with custom Arbitrary generating 1–50 waypoints with valid coordinate ranges (latitude ±89.999999, longitude ±179.999999, altitude 5–120m, pitch -90–0, yaw 0–359.99)
    - This arbitrary is used by all property tests in tasks 2.2, 2.3, 3.2, 4.2, 6.1
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

- [x] 7. Implement MediatR query, validator, and handler
  - [x] 7.1 Create ExportMissionFileQuery and MissionFileResult DTO
    - Create `Api/Queries/ExportMissionFileQuery.cs` as sealed record implementing `IRequest<OneOf<MissionFileResult, ValidationErrorResponse, ErrorResponse>>`
    - Create `Api/DTOs/MissionFileResult.cs` as sealed record with Content (byte[]), ContentType (string), FileName (string)
    - _Requirements: 1.6_

  - [x] 7.2 Create ExportMissionFileQueryValidator
    - Create `Api/Validators/ExportMissionFileQueryValidator.cs` extending `AbstractValidator<ExportMissionFileQuery>`
    - Validate FlightPlanId is not empty Guid
    - Validate Format is a defined enum value with message listing supported formats
    - _Requirements: 2.2, 2.3_

  - [x] 7.3 Implement ExportMissionFileQueryHandler
    - Create `Api/Handlers/ExportMissionFileQueryHandler.cs` implementing `IRequestHandler<ExportMissionFileQuery, OneOf<MissionFileResult, ValidationErrorResponse, ErrorResponse>>`
    - Inject IFlightPlanRepository, IMissionFileGeneratorFactory, ILogger
    - Load FlightPlanEntity by ID → return 404 ErrorResponse if not found
    - Deserialize WaypointsJson → catch JsonException, log error, return 500 ErrorResponse with corrupted data message
    - Validate waypoints list non-empty → return 422 ValidationErrorResponse if empty
    - Delegate to generator via factory → return MissionFileResult
    - Log errors at Error level with correlation context
    - _Requirements: 1.6, 2.1, 2.4, 6.5, 8.1, 8.2, 8.3_

  - [x] 7.4 Write unit tests for ExportMissionFileQueryHandler
    - Test 404 when flight plan not found
    - Test 422 when waypoints list is empty
    - Test 500 when WaypointsJson is corrupted (JsonException)
    - Test successful generation delegates to correct generator
    - _Requirements: 2.1, 2.4, 8.1, 8.2_

- [x] 8. Implement API endpoint and DI registration
  - [x] 8.1 Add export endpoint to FlightPlansEndpoint
    - Add `GET /{id:guid}/export` endpoint to existing `FlightPlansEndpoint.cs`
    - Accept `format` query string parameter, parse to ExportFormat enum
    - Return 422 if format parameter missing or unparseable
    - Send ExportMissionFileQuery via MediatR
    - Map OneOf result: MissionFileResult → Results.File with content-type and content-disposition headers, ValidationErrorResponse → Results.UnprocessableEntity, ErrorResponse → Results.NotFound or Results.Problem based on message content
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 8.1_

  - [x] 8.2 Register mission export services in DI container
    - Add to `ServiceCollectionExtensions.AddApplicationServices()`: register all three generators as `IMissionFileGenerator` implementations, register `MissionFileGeneratorFactory` as `IMissionFileGeneratorFactory`
    - _Requirements: 1.6_

  - [x] 8.3 Write integration test for export endpoint
    - Create `Tests/Api.Tests/Integration/ExportMissionFileEndpointTests.cs` using WebApplicationFactory
    - Test successful CSV export returns 200 with correct Content-Type and Content-Disposition
    - Test successful KML export returns 200 with correct headers
    - Test successful KMZ export returns 200 with correct headers
    - Test 404 for non-existent flight plan
    - Test 422 for missing format parameter
    - Test 422 for invalid format value
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using FsCheck 3.x with xUnit
- Unit tests validate specific examples and edge cases
- The WaypointListArbitrary (task 6.3) should be created first if running property tests, but is marked optional since all PBT tasks are optional
- All generators are pure functions (no I/O) making them ideal for property-based testing
- The project uses .NET 10, sealed records, and existing patterns (MediatR, OneOf, FluentValidation, Minimal API)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "6.3"] },
    { "id": 2, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "4.2", "6.1", "6.2"] },
    { "id": 4, "tasks": ["7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3"] },
    { "id": 6, "tasks": ["7.4", "8.1", "8.2"] },
    { "id": 7, "tasks": ["8.3"] }
  ]
}
```
