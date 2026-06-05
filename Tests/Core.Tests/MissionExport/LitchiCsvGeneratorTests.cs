using System.Text;
using DroneMesh3D.Core.FlightPath;
using DroneMesh3D.Core.MissionExport;

namespace DroneMesh3D.Core.Tests.MissionExport;

public sealed class LitchiCsvGeneratorTests
{
    private readonly LitchiCsvGenerator _sut = new();

    [Fact]
    public void Format_ReturnsLitchiCsv() => Assert.Equal(ExportFormat.LitchiCsv, _sut.Format);

    [Fact]
    public void Generate_ReturnsCorrectContentType()
    {
        var waypoints = new List<Waypoint> { new(45.0, 12.0, 50.0, -30.0, 180.0) };

        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        Assert.Equal("text/csv", result.ContentType);
    }

    [Fact]
    public void Generate_ReturnsCorrectFileName()
    {
        var id = Guid.Parse("12345678-1234-1234-1234-123456789abc");
        var waypoints = new List<Waypoint> { new(45.0, 12.0, 50.0, -30.0, 180.0) };

        var result = _sut.Generate(id, waypoints);

        Assert.Equal($"mission_{id}.csv", result.FileName);
    }

    [Fact]
    public void Generate_OutputIsUtf8WithoutBom()
    {
        var waypoints = new List<Waypoint> { new(45.0, 12.0, 50.0, -30.0, 180.0) };

        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        // UTF-8 BOM is 0xEF, 0xBB, 0xBF
        Assert.True(result.Content.Length >= 3);
        Assert.False(
            result.Content[0] == 0xEF && result.Content[1] == 0xBB && result.Content[2] == 0xBF,
            "Content should not start with a UTF-8 BOM");

        // Verify it's valid UTF-8
        var text = Encoding.UTF8.GetString(result.Content);
        Assert.NotEmpty(text);
    }

    [Fact]
    public void Generate_HeaderHasCorrectColumns()
    {
        var waypoints = new List<Waypoint> { new(45.0, 12.0, 50.0, -30.0, 180.0) };

        var result = _sut.Generate(Guid.NewGuid(), waypoints);
        var text = Encoding.UTF8.GetString(result.Content);
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(
            "latitude,longitude,altitude(m),heading(deg),curvesize(m),rotationdir,gimbalmode,gimbalpitchangle,actiontype1,actionparam1,speed(m/s)",
            lines[0]);
    }

    [Fact]
    public void Generate_MapsWaypointFieldsCorrectly()
    {
        var wp = new Waypoint(48.123456, 16.654321, 75.5, -45.25, 270.75);
        var waypoints = new List<Waypoint> { wp };

        var result = _sut.Generate(Guid.NewGuid(), waypoints);
        var text = Encoding.UTF8.GetString(result.Content);
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        var fields = lines[1].Split(',');

        Assert.Equal(11, fields.Length);
        Assert.Equal("48.123456", fields[0]); // latitude
        Assert.Equal("16.654321", fields[1]); // longitude
        Assert.Equal("75.50", fields[2]); // altitude(m)
        Assert.Equal("270.75", fields[3]); // heading = GimbalYawDegrees
        Assert.Equal("0", fields[4]); // curvesize
        Assert.Equal("0", fields[5]); // rotationdir
        Assert.Equal("0", fields[6]); // gimbalmode
        Assert.Equal("-45.25", fields[7]); // gimbalpitchangle = GimbalPitchDegrees
        Assert.Equal("1", fields[8]); // actiontype1 (TakePhoto)
        Assert.Equal("0", fields[9]); // actionparam1
        Assert.Equal("15", fields[10]); // speed(m/s)
    }

    [Fact]
    public void Generate_UsesLfNewlines()
    {
        var waypoints = new List<Waypoint> { new(45.0, 12.0, 50.0, -30.0, 180.0) };

        var result = _sut.Generate(Guid.NewGuid(), waypoints);
        var text = Encoding.UTF8.GetString(result.Content);

        Assert.DoesNotContain("\r\n", text);
        Assert.Contains("\n", text);
    }

    [Fact]
    public void Generate_PreservesWaypointOrder()
    {
        var waypoints = new List<Waypoint>
        {
            new(10.0, 20.0, 30.0, -10.0, 90.0),
            new(40.0, 50.0, 60.0, -20.0, 180.0),
            new(70.0, 80.0, 90.0, -30.0, 270.0)
        };

        var result = _sut.Generate(Guid.NewGuid(), waypoints);
        var text = Encoding.UTF8.GetString(result.Content);
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        // 1 header + 3 data rows
        Assert.Equal(4, lines.Length);

        // Verify order by checking latitude of each row
        Assert.StartsWith("10.000000", lines[1]);
        Assert.StartsWith("40.000000", lines[2]);
        Assert.StartsWith("70.000000", lines[3]);
    }

    [Fact]
    public void Generate_UsesInvariantCultureForDecimals()
    {
        // Ensure decimal separator is always '.' not ','
        var wp = new Waypoint(48.5, 16.5, 75.5, -45.5, 270.5);
        var waypoints = new List<Waypoint> { wp };

        var result = _sut.Generate(Guid.NewGuid(), waypoints);
        var text = Encoding.UTF8.GetString(result.Content);
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        var dataRow = lines[1];

        // All fields use '.' as decimal separator (no locale-dependent ',')
        var fields = dataRow.Split(',');
        Assert.Equal(11, fields.Length); // comma-split should give exactly 11 fields
        Assert.Contains(".", fields[0]); // latitude has decimal point
        Assert.Contains(".", fields[1]); // longitude has decimal point
    }
}
