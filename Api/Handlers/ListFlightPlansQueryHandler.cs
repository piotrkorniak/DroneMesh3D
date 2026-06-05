using System.Text.Json;
using DroneMesh3D.Api.DTOs;
using DroneMesh3D.Api.Queries;
using DroneMesh3D.Core.Interfaces;
using MediatR;

namespace DroneMesh3D.Api.Handlers;

public sealed class ListFlightPlansQueryHandler(
    IFlightPlanRepository flightPlanRepository,
    ILogger<ListFlightPlansQueryHandler> logger)
    : IRequestHandler<ListFlightPlansQuery, List<FlightPlanResponse>>
{
    public async Task<List<FlightPlanResponse>> Handle(ListFlightPlansQuery request, CancellationToken ct)
    {
        var entities = await flightPlanRepository.ListAsync(request.AreaId, request.Limit, request.Offset, ct);

        return entities.Select(entity =>
        {
            List<WaypointDto> waypoints;
            try
            {
                waypoints = JsonSerializer.Deserialize<List<WaypointDto>>(entity.WaypointsJson) ?? [];
            }
            catch (JsonException ex)
            {
                logger.LogError(ex, "Failed to deserialize waypoints for flight plan {FlightPlanId}", entity.Id);
                waypoints = [];
            }

            return new FlightPlanResponse(
                entity.Id,
                entity.AreaId,
                entity.Mode.ToString(),
                waypoints,
                new FlightStatisticsDto(
                    entity.TotalDistanceM,
                    entity.EstimatedFlightTimeS,
                    entity.PhotoCount,
                    entity.CoveredAreaM2),
                entity.CreatedAt);
        }).ToList();
    }
}
