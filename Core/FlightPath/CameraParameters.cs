namespace DroneMesh3D.Core.FlightPath;

public sealed record CameraParameters(
    double SensorWidthMm,
    double FocalLengthMm,
    int ImageWidthPx,
    int ImageHeightPx)
{
    // Required by EF Core for materialization of owned types
    private CameraParameters() : this(default, default, default, default)
    {
    }
}
