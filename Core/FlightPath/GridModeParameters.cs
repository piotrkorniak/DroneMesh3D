namespace DroneMesh3D.Core.FlightPath;

public sealed record GridModeParameters(
    double AltitudeM,
    CameraParameters Camera,
    double FrontOverlapPercent,
    double SideOverlapPercent,
    double? HeadingDegrees)
{
    // Required by EF Core for materialization of owned types
    private GridModeParameters() : this(default, null!, default, default, default)
    {
    }
}
