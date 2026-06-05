namespace DroneMesh3D.Core.FlightPath;

public sealed record Waypoint(
    double Latitude,
    double Longitude,
    double AltitudeAglM,
    double GimbalPitchDegrees,
    double GimbalYawDegrees)
{
    // Required by EF Core for materialization of owned types
    private Waypoint() : this(default, default, default, default, default)
    {
    }
}
