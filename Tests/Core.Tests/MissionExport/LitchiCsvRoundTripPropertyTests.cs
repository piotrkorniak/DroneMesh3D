using System.Globalization;
using System.Text;
using DroneMesh3D.Core.FlightPath;
using DroneMesh3D.Core.MissionExport;
using FsCheck.Xunit;

namespace DroneMesh3D.Core.Tests.MissionExport;

/// <summary>
///     Feature: mission-file-generation, Property 1: CSV round-trip preserves waypoint data
///     **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 6.2, 7.3**
/// </summary>
public sealed class LitchiCsvRoundTripPropertyTests
{
    private readonly LitchiCsvGenerator _sut = new();

    /// <summary>
    ///     Feature: mission-file-generation, Property 1: CSV round-trip preserves waypoint data
    ///     **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 6.2, 7.3**
    ///     Property: For any non-empty list of valid waypoints, generating a Litchi CSV file and
    ///     parsing it back SHALL produce rows where each row's latitude, longitude, and altitude
    ///     values are equal to the original waypoint values with a precision of at least 6 decimal
    ///     places, heading equals GimbalYawDegrees, gimbalpitchangle equals GimbalPitchDegrees,
    ///     curvesize=0, rotationdir=0, gimbalmode=0, actiontype1=1, actionparam1=0, and speed=15.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool CsvRoundTrip_PreservesWaypointData(IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        var text = Encoding.UTF8.GetString(result.Content);
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        // Should have header + one row per waypoint
        if (lines.Length != waypoints.Count + 1)
        {
            return false;
        }

        for (var i = 0; i < waypoints.Count; i++)
        {
            var wp = waypoints[i];
            var fields = lines[i + 1].Split(',');

            if (fields.Length != 11)
            {
                return false;
            }

            var parsedLat = double.Parse(fields[0], CultureInfo.InvariantCulture);
            var parsedLon = double.Parse(fields[1], CultureInfo.InvariantCulture);
            var parsedAlt = double.Parse(fields[2], CultureInfo.InvariantCulture);
            var parsedHeading = double.Parse(fields[3], CultureInfo.InvariantCulture);
            var parsedCurveSize = int.Parse(fields[4], CultureInfo.InvariantCulture);
            var parsedRotationDir = int.Parse(fields[5], CultureInfo.InvariantCulture);
            var parsedGimbalMode = int.Parse(fields[6], CultureInfo.InvariantCulture);
            var parsedGimbalPitch = double.Parse(fields[7], CultureInfo.InvariantCulture);
            var parsedActionType1 = int.Parse(fields[8], CultureInfo.InvariantCulture);
            var parsedActionParam1 = int.Parse(fields[9], CultureInfo.InvariantCulture);
            var parsedSpeed = double.Parse(fields[10], CultureInfo.InvariantCulture);

            // Latitude precision: 6 decimal places (F6 format)
            if (Math.Abs(parsedLat - wp.Latitude) > 0.000001)
            {
                return false;
            }

            // Longitude precision: 6 decimal places (F6 format)
            if (Math.Abs(parsedLon - wp.Longitude) > 0.000001)
            {
                return false;
            }

            // Altitude precision: 2 decimal places (F2 format)
            if (Math.Abs(parsedAlt - wp.AltitudeAglM) > 0.01)
            {
                return false;
            }

            // Heading = GimbalYawDegrees (F2 format)
            if (Math.Abs(parsedHeading - wp.GimbalYawDegrees) > 0.01)
            {
                return false;
            }

            // GimbalPitchAngle = GimbalPitchDegrees (F2 format)
            if (Math.Abs(parsedGimbalPitch - wp.GimbalPitchDegrees) > 0.01)
            {
                return false;
            }

            // Fixed values
            if (parsedCurveSize != 0)
            {
                return false;
            }

            if (parsedRotationDir != 0)
            {
                return false;
            }

            if (parsedGimbalMode != 0)
            {
                return false;
            }

            if (parsedActionType1 != 1)
            {
                return false;
            }

            if (parsedActionParam1 != 0)
            {
                return false;
            }

            if (parsedSpeed != 15)
            {
                return false;
            }
        }

        return true;
    }
}
