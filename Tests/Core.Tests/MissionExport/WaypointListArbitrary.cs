using DroneMesh3D.Core.FlightPath;
using FsCheck;
using FsCheck.Fluent;

namespace DroneMesh3D.Core.Tests.MissionExport;

/// <summary>
///     Generates valid waypoint lists for mission file generation property-based testing.
///     Lists contain 1–50 waypoints with valid coordinate ranges:
///     latitude ±89.999999, longitude ±179.999999, altitude 5–120m,
///     pitch -90–0°, yaw 0–359.99°.
/// </summary>
public sealed class WaypointListArbitrary
{
    public static Arbitrary<IReadOnlyList<Waypoint>> Generate()
    {
        var gen = Gen.Choose(1, 50).SelectMany(count =>
            ArbWaypoint().ArrayOf(count).Select(waypoints =>
                (IReadOnlyList<Waypoint>)waypoints.ToList().AsReadOnly()));

        return Arb.From(gen);
    }

    private static Gen<Waypoint> ArbWaypoint()
    {
        return Gen.Choose(-89_999999, 89_999999).SelectMany(latRaw =>
            Gen.Choose(-179_999999, 179_999999).SelectMany(lonRaw =>
                Gen.Choose(500, 12000).SelectMany(altRaw =>
                    Gen.Choose(-9000, 0).SelectMany(pitchRaw =>
                        Gen.Choose(0, 35999).Select(yawRaw =>
                            new Waypoint(
                                latRaw / 1_000_000.0,
                                lonRaw / 1_000_000.0,
                                altRaw / 100.0,
                                pitchRaw / 100.0,
                                yawRaw / 100.0))))));
    }
}
