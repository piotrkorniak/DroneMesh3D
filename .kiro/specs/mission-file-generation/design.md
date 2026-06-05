# Design Document: Mission File Generation

## Overview

This feature adds mission file export capability to DroneMesh3D. Given an existing `FlightPlanEntity` (produced by the flight path calculation step), the system generates downloadable mission files in three formats: Litchi CSV, KML, and DJI WPML (KMZ). Each format maps the stored waypoints into navigation commands consumable by external drone control applications.

The design follows the project's established patterns: a MediatR query with `OneOf` return type, a Minimal API endpoint, FluentValidation for request validation, and dedicated generator services behind an interface abstraction (Strategy pattern). The generators are pure functions operating on deserialized waypoint data — no I/O beyond reading the flight plan from the database.

## Architecture

```mermaid
flowchart TD
    Client[Client] -->|GET /api/flight-plans/{id}/export?format=X| Endpoint[ExportMissionFileEndpoint]
    Endpoint --> Mediator[MediatR Pipeline]
    Mediator --> Validator[ExportMissionFileQueryValidator]
    Validator --> Handler[ExportMissionFileQueryHandler]
    Handler --> Repo[IFlightPlanRepository]
    Handler --> Factory[IMissionFileGeneratorFactory]
    Factory --> CSV[LitchiCsvGenerator]
    Factory --> KML[KmlGenerator]
    Factory --> WPML[DjiWpmlGenerator]
    Handler -->|OneOf Success/Error| Endpoint
    Endpoint -->|File Response| Client
```

The architecture separates concerns into:
1. **Endpoint layer** — HTTP routing, content-type negotiation, response mapping
2. **Query/Handler layer** — orchestration, flight plan retrieval, format dispatch
3. **Generator layer** — pure format-specific file generation from waypoint data

## Components and Interfaces

### Export Format Enum

```csharp
namespace DroneMesh3D.Core.MissionExport;

public enum ExportFormat
{
    LitchiCsv,
    Kml,
    DjiWpml
}
```

### MediatR Query

```csharp
namespace DroneMesh3D.Api.Queries;

public sealed record ExportMissionFileQuery(Guid FlightPlanId, ExportFormat Format)
    : IRequest<OneOf<MissionFileResult, ValidationErrorResponse, ErrorResponse>>;
```

### Mission File Result

```csharp
namespace DroneMesh3D.Api.DTOs;

public sealed record MissionFileResult(
    byte[] Content,
    string ContentType,
    string FileName);
```

### Generator Interface (Strategy Pattern)

```csharp
namespace DroneMesh3D.Core.MissionExport;

public interface IMissionFileGenerator
{
    ExportFormat Format { get; }
    MissionFileData Generate(Guid flightPlanId, IReadOnlyList<Waypoint> waypoints);
}

public sealed record MissionFileData(
    byte[] Content,
    string ContentType,
    string FileName);
```

### Generator Factory

```csharp
namespace DroneMesh3D.Core.MissionExport;

public interface IMissionFileGeneratorFactory
{
    IMissionFileGenerator GetGenerator(ExportFormat format);
}

public sealed class MissionFileGeneratorFactory(
    IEnumerable<IMissionFileGenerator> generators) : IMissionFileGeneratorFactory
{
    private readonly Dictionary<ExportFormat, IMissionFileGenerator> _generators =
        generators.ToDictionary(g => g.Format);

    public IMissionFileGenerator GetGenerator(ExportFormat format) =>
        _generators.TryGetValue(format, out var generator)
            ? generator
            : throw new ArgumentOutOfRangeException(nameof(format), $"No generator for format: {format}");
}
```

### LitchiCsvGenerator

Produces a CSV file with the Litchi-specific column layout. Key characteristics:
- Header row with exact column names per Litchi spec
- One data row per waypoint
- Comma separator, UTF-8 without BOM
- Fixed values: `curvesize=0`, `rotationdir=0`, `gimbalmode=0`, `actiontype1=1`, `actionparam1=0`, `speed=15`
- Mapped values: `latitude`, `longitude`, `altitude(m)` (AGL), `heading(deg)` (GimbalYawDegrees), `gimbalpitchangle` (GimbalPitchDegrees)

### KmlGenerator

Produces a KML 2.2 XML document:
- Root element with `xmlns="http://www.opengis.net/kml/2.2"`
- `Document` element with mission name
- One `Placemark` per waypoint containing:
  - `Point` with coordinates in `longitude,latitude,altitude` order
  - `ExtendedData` with gimbalPitch, gimbalYaw, action (TakePhoto), speed (15)

### DjiWpmlGenerator

Produces a KMZ (ZIP) archive containing two XML files:

**template.kml:**
- Dual namespace: KML 2.2 + WPML (`http://www.dji.com/wpmz/1.0.2`)
- `missionConfig` element with fixed flight parameters
- Folder with template metadata and one `Placemark` per waypoint

**waylines.wpml:**
- Same dual namespace
- One `waypoint` element per waypoint with action groups
- Each action group contains `takePhoto` triggered by `reachPoint`

### Endpoint

```csharp
group.MapGet("/{id:guid}/export", ExportMissionFile)
    .Produces<FileContentResult>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status404NotFound)
    .ProducesProblem(StatusCodes.Status422UnprocessableEntity)
    .ProducesProblem(StatusCodes.Status500InternalServerError);
```

### Handler Orchestration

```csharp
public sealed class ExportMissionFileQueryHandler(
    IFlightPlanRepository flightPlanRepository,
    IMissionFileGeneratorFactory generatorFactory,
    ILogger<ExportMissionFileQueryHandler> logger)
    : IRequestHandler<ExportMissionFileQuery, OneOf<MissionFileResult, ValidationErrorResponse, ErrorResponse>>
```

The handler:
1. Loads `FlightPlanEntity` by ID (returns 404 if not found)
2. Deserializes `WaypointsJson` into `List<Waypoint>` (returns 500 if corrupted)
3. Validates waypoint list is non-empty (returns 422 if empty)
4. Delegates to the appropriate generator via factory
5. Returns `MissionFileResult` with content bytes, content-type, and filename

### Validator

```csharp
public sealed class ExportMissionFileQueryValidator : AbstractValidator<ExportMissionFileQuery>
{
    public ExportMissionFileQueryValidator()
    {
        RuleFor(x => x.FlightPlanId).NotEqual(Guid.Empty);
        RuleFor(x => x.Format).IsInEnum()
            .WithMessage("Format must be one of: LitchiCsv, Kml, DjiWpml");
    }
}
```

## Data Models

### Input (from database)

```
FlightPlanEntity
├── Id: Guid
├── AreaId: Guid
├── Mode: FlightMode
├── WaypointsJson: string (JSON array of Waypoint)
├── ...statistics fields...
└── CreatedAt: DateTimeOffset

Waypoint (deserialized from WaypointsJson)
├── Latitude: double
├── Longitude: double
├── AltitudeAglM: double
├── GimbalPitchDegrees: double
└── GimbalYawDegrees: double
```

### Output (per format)

**Litchi CSV row:**
```
latitude,longitude,altitude(m),heading(deg),curvesize(m),rotationdir,gimbalmode,gimbalpitchangle,actiontype1,actionparam1,speed(m/s)
```

**KML Placemark:**
```xml
<Placemark>
  <name>WP{index}</name>
  <Point><coordinates>lon,lat,alt</coordinates></Point>
  <ExtendedData>
    <Data name="gimbalPitch"><value>{pitch}</value></Data>
    <Data name="gimbalYaw"><value>{yaw}</value></Data>
    <Data name="action"><value>TakePhoto</value></Data>
    <Data name="speed"><value>15</value></Data>
  </ExtendedData>
</Placemark>
```

**DJI WPML template.kml Placemark:**
```xml
<Placemark>
  <Point><coordinates>lon,lat</coordinates></Point>
  <wpml:index>{i}</wpml:index>
  <wpml:height>{altitudeAgl}</wpml:height>
  <wpml:gimbalPitchAngle>{pitch}</wpml:gimbalPitchAngle>
</Placemark>
```

### Constants

```csharp
public static class MissionConstants
{
    public const double MaxSpeedMs = 15.0;
    public const int LitchiGimbalMode = 0; // Manual control
    public const int LitchiActionTypeTakePhoto = 1;
    public const int LitchiActionParam = 0;
    public const int LitchiCurveSize = 0;
    public const int LitchiRotationDir = 0;
    public const double DjiTakeOffSecurityHeight = 20.0;
    public const string DjiFlyToWaylineMode = "safely";
    public const string DjiFinishAction = "goHome";
    public const string DjiExitOnRCLost = "executeLostAction";
    public const string DjiExecuteRCLostAction = "hover";
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CSV round-trip preserves waypoint data

*For any* non-empty list of valid waypoints, generating a Litchi CSV file and parsing it back SHALL produce rows where each row's latitude, longitude, and altitude values are equal to the original waypoint values with a precision of at least 6 decimal places, heading equals GimbalYawDegrees, gimbalpitchangle equals GimbalPitchDegrees, curvesize=0, rotationdir=0, gimbalmode=0, actiontype1=1, actionparam1=0, and speed=15.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 6.2, 7.3**

### Property 2: CSV structural correctness

*For any* non-empty list of valid waypoints, the generated Litchi CSV SHALL have a header row with exactly 11 columns matching the specified names, every data row SHALL have exactly the same number of columns as the header, the file SHALL use comma separators, and the byte content SHALL be UTF-8 encoded without a BOM prefix.

**Validates: Requirements 3.1, 3.6, 7.1**

### Property 3: KML round-trip structural validity

*For any* non-empty list of N valid waypoints, the generated KML SHALL parse as well-formed XML with namespace `http://www.opengis.net/kml/2.2`, contain a Document element with exactly N Placemark children, where each Placemark's Point coordinates are in longitude,latitude,altitude order matching the original waypoint, and ExtendedData contains gimbalPitch, gimbalYaw, action=TakePhoto, and speed=15.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 7.2, 7.4**

### Property 4: KMZ structural round-trip

*For any* non-empty list of N valid waypoints, the generated KMZ archive SHALL contain exactly two entries named `template.kml` and `waylines.wpml`, both parseable as valid XML. The `template.kml` SHALL declare both KML and WPML namespaces, contain a missionConfig with the correct fixed values (flyToWaylineMode=safely, finishAction=goHome, globalTransitionalSpeed=15, etc.), and exactly N Placemarks with correct coordinates, index, height, and gimbalPitchAngle. The `waylines.wpml` SHALL contain N waypoint elements each with a takePhoto action triggered by reachPoint.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.5, 7.6**

### Property 5: Waypoint order preservation

*For any* ordered list of waypoints with distinct coordinates, all three generators (CSV, KML, DJI WPML) SHALL produce output records in the same sequential order as the input list — the i-th output record corresponds to the i-th input waypoint.

**Validates: Requirements 6.1, 6.5**

### Property 6: Invalid format rejection

*For any* string value that does not match one of the supported export format identifiers (LitchiCsv, Kml, DjiWpml), the system SHALL return a validation error response.

**Validates: Requirements 2.2**

## Error Handling

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Flight plan not found | 404 | Problem Details with "not found" message |
| Missing/invalid `format` param | 422 | ValidationErrorResponse listing supported formats |
| Empty waypoints in flight plan | 422 | ValidationErrorResponse stating no waypoints to export |
| WaypointsJson deserialization failure | 500 | ErrorResponse with "corrupted data" message |
| Unexpected exception in generator | 500 | ErrorResponse with generic message |

All errors are logged at `Error` level with the request correlation ID (via `ILogger`). Internal exception details are never exposed in HTTP responses.

The handler catches `JsonException` during deserialization and returns a typed error rather than letting it bubble up to the global exception handler. The global exception handler (`GlobalExceptionHandler`) remains as a safety net for truly unexpected failures.

## Testing Strategy

### Property-Based Tests (FsCheck + xUnit)

The feature's core generators are pure functions (waypoints in → bytes out) making them ideal for property-based testing. Each correctness property maps to a single FsCheck property test with a minimum of 100 iterations.

**Library:** FsCheck 3.x with FsCheck.Xunit (already used in the project)

**Test configuration:**
- Minimum 100 iterations per property (`MaxTest = 100`)
- Custom `Arbitrary<IReadOnlyList<Waypoint>>` generating 1–50 waypoints with valid coordinate ranges
- Each test tagged with: `Feature: mission-file-generation, Property {N}: {description}`

**Property tests cover:**
1. CSV round-trip (Property 1)
2. CSV structural correctness (Property 2)
3. KML round-trip (Property 3)
4. KMZ structural round-trip (Property 4)
5. Waypoint order preservation (Property 5)
6. Invalid format rejection (Property 6)

### Unit Tests (xUnit)

Example-based tests for specific scenarios:
- Correct Content-Type and Content-Disposition headers per format (Requirements 1.3, 1.4, 1.5)
- Document name format in KML (Requirement 4.5)
- 404 when flight plan not found (Requirement 2.1)
- 422 when format parameter missing (Requirement 2.3)
- 422 when waypoints list empty (Requirement 2.4)
- 500 on corrupted WaypointsJson (Requirement 8.2)
- Error logging with correlation ID (Requirement 8.3)

### Integration Tests

- Full endpoint round-trip with in-memory database (WebApplicationFactory)
- Verifies endpoint registration, routing, MediatR pipeline, and response shape

### Custom Arbitrary for Waypoints

```csharp
public sealed class WaypointListArbitrary
{
    public static Arbitrary<IReadOnlyList<Waypoint>> Generate() =>
        (from count in Gen.Choose(1, 50)
         from waypoints in Gen.ListOf(count, ArbWaypoint())
         select (IReadOnlyList<Waypoint>)waypoints.ToList().AsReadOnly())
        .ToArbitrary();

    private static Gen<Waypoint> ArbWaypoint() =>
        from lat in Gen.Choose(-89_999999, 89_999999).Select(x => x / 1_000_000.0)
        from lon in Gen.Choose(-179_999999, 179_999999).Select(x => x / 1_000_000.0)
        from alt in Gen.Choose(5_00, 120_00).Select(x => x / 100.0)
        from pitch in Gen.Choose(-90_00, 0).Select(x => x / 100.0)
        from yaw in Gen.Choose(0, 359_99).Select(x => x / 100.0)
        select new Waypoint(lat, lon, alt, pitch, yaw);
}
```
