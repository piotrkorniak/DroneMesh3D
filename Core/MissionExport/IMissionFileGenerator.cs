using DroneMesh3D.Core.FlightPath;

namespace DroneMesh3D.Core.MissionExport;

/// <summary>
///     Generates a mission file in a specific export format from a list of waypoints.
/// </summary>
public interface IMissionFileGenerator
{
    /// <summary>
    ///     The export format this generator produces.
    /// </summary>
    ExportFormat Format { get; }

    /// <summary>
    ///     Generates a mission file from the given waypoints.
    /// </summary>
    /// <param name="flightPlanId">The flight plan identifier used in file naming.</param>
    /// <param name="waypoints">The ordered list of waypoints to include in the mission file.</param>
    /// <returns>The generated mission file data including content bytes, content type, and file name.</returns>
    MissionFileData Generate(Guid flightPlanId, IReadOnlyList<Waypoint> waypoints);
}
