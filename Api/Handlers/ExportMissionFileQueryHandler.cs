using System.Text.Json;
using DroneMesh3D.Api.DTOs;
using DroneMesh3D.Api.Queries;
using DroneMesh3D.Core.FlightPath;
using DroneMesh3D.Core.Interfaces;
using DroneMesh3D.Core.MissionExport;
using MediatR;
using OneOf;

namespace DroneMesh3D.Api.Handlers;

public sealed class ExportMissionFileQueryHandler(
    IFlightPlanRepository flightPlanRepository,
    IMissionFileGeneratorFactory generatorFactory,
    ILogger<ExportMissionFileQueryHandler> logger)
    : IRequestHandler<ExportMissionFileQuery, OneOf<MissionFileResult, ValidationErrorResponse, ErrorResponse>>
{
    public async Task<OneOf<MissionFileResult, ValidationErrorResponse, ErrorResponse>> Handle(
        ExportMissionFileQuery query,
        CancellationToken ct)
    {
        // 1. Load FlightPlanEntity by ID
        var entity = await flightPlanRepository.GetByIdAsync(query.FlightPlanId, ct);
        if (entity is null)
        {
            logger.LogError(
                "Flight plan with ID '{FlightPlanId}' was not found",
                query.FlightPlanId);
            return new ErrorResponse($"Flight plan with ID '{query.FlightPlanId}' was not found.");
        }

        // 2. Deserialize WaypointsJson into List<Waypoint>
        List<Waypoint> waypoints;
        try
        {
            waypoints = JsonSerializer.Deserialize<List<Waypoint>>(entity.WaypointsJson) ?? [];
        }
        catch (JsonException ex)
        {
            logger.LogError(
                ex,
                "Failed to deserialize waypoints for flight plan {FlightPlanId}. Data may be corrupted",
                query.FlightPlanId);
            return new ErrorResponse("Flight plan waypoint data is corrupted and cannot be processed.");
        }

        // 3. Validate waypoints list is non-empty
        if (waypoints.Count == 0)
        {
            return new ValidationErrorResponse(["Flight plan contains no waypoints to export."]);
        }

        // 4. Delegate to the appropriate generator via factory
        var generator = generatorFactory.GetGenerator(query.Format);
        var fileData = generator.Generate(query.FlightPlanId, waypoints);

        // 5. Return MissionFileResult
        return new MissionFileResult(fileData.Content, fileData.ContentType, fileData.FileName);
    }
}
