using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using DroneMesh3D.Core.FlightPath;
using DroneMesh3D.Core.MissionExport;
using FsCheck.Xunit;

namespace DroneMesh3D.Core.Tests.MissionExport;

/// <summary>
///     Feature: mission-file-generation, Property 5: Waypoint order preservation
///     **Validates: Requirements 6.1, 6.5**
///     For any ordered list of waypoints with distinct coordinates, all three generators
///     (CSV, KML, DJI WPML) SHALL produce output records in the same sequential order
///     as the input list — the i-th output record corresponds to the i-th input waypoint.
/// </summary>
public sealed class WaypointOrderPropertyTests
{
    private static readonly XNamespace KmlNs = "http://www.opengis.net/kml/2.2";
    private static readonly XNamespace WpmlNs = "http://www.dji.com/wpmz/1.0.2";

    /// <summary>
    ///     Property 5: Waypoint order preservation — CSV generator
    ///     **Validates: Requirements 6.1, 6.5**
    ///     The i-th CSV data row's coordinates match the i-th input waypoint.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool Csv_PreservesWaypointOrder(IReadOnlyList<Waypoint> waypoints)
    {
        var generator = new LitchiCsvGenerator();
        var result = generator.Generate(Guid.NewGuid(), waypoints);
        var text = Encoding.UTF8.GetString(result.Content);
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        // First line is header, remaining are data rows
        if (lines.Length - 1 != waypoints.Count)
        {
            return false;
        }

        for (var i = 0; i < waypoints.Count; i++)
        {
            var fields = lines[i + 1].Split(',');
            var lat = double.Parse(fields[0], CultureInfo.InvariantCulture);
            var lon = double.Parse(fields[1], CultureInfo.InvariantCulture);
            var alt = double.Parse(fields[2], CultureInfo.InvariantCulture);

            if (Math.Abs(lat - waypoints[i].Latitude) > 1e-5)
            {
                return false;
            }

            if (Math.Abs(lon - waypoints[i].Longitude) > 1e-5)
            {
                return false;
            }

            if (Math.Abs(alt - waypoints[i].AltitudeAglM) > 1e-1)
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>
    ///     Property 5: Waypoint order preservation — KML generator
    ///     **Validates: Requirements 6.1, 6.5**
    ///     The i-th KML Placemark's coordinates match the i-th input waypoint.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool Kml_PreservesWaypointOrder(IReadOnlyList<Waypoint> waypoints)
    {
        var generator = new KmlGenerator();
        var result = generator.Generate(Guid.NewGuid(), waypoints);
        var text = Encoding.UTF8.GetString(result.Content);
        var doc = XDocument.Parse(text);

        var placemarks = doc.Descendants(KmlNs + "Placemark").ToList();

        if (placemarks.Count != waypoints.Count)
        {
            return false;
        }

        for (var i = 0; i < waypoints.Count; i++)
        {
            var coordText = placemarks[i]
                .Element(KmlNs + "Point")?
                .Element(KmlNs + "coordinates")?.Value;

            if (coordText is null)
            {
                return false;
            }

            // KML format: longitude,latitude,altitude
            var parts = coordText.Split(',');
            var lon = double.Parse(parts[0], CultureInfo.InvariantCulture);
            var lat = double.Parse(parts[1], CultureInfo.InvariantCulture);
            var alt = double.Parse(parts[2], CultureInfo.InvariantCulture);

            if (Math.Abs(lat - waypoints[i].Latitude) > 1e-5)
            {
                return false;
            }

            if (Math.Abs(lon - waypoints[i].Longitude) > 1e-5)
            {
                return false;
            }

            if (Math.Abs(alt - waypoints[i].AltitudeAglM) > 1e-1)
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>
    ///     Property 5: Waypoint order preservation — DJI WPML generator
    ///     **Validates: Requirements 6.1, 6.5**
    ///     The i-th template.kml Placemark's coordinates match the i-th input waypoint.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool DjiWpml_PreservesWaypointOrder(IReadOnlyList<Waypoint> waypoints)
    {
        var generator = new DjiWpmlGenerator();
        var result = generator.Generate(Guid.NewGuid(), waypoints);

        using var stream = new MemoryStream(result.Content);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var templateEntry = archive.GetEntry("template.kml");
        if (templateEntry is null)
        {
            return false;
        }

        using var entryStream = templateEntry.Open();
        var doc = XDocument.Load(entryStream);

        var placemarks = doc.Descendants(KmlNs + "Placemark").ToList();

        if (placemarks.Count != waypoints.Count)
        {
            return false;
        }

        for (var i = 0; i < waypoints.Count; i++)
        {
            var coordText = placemarks[i]
                .Element(KmlNs + "Point")?
                .Element(KmlNs + "coordinates")?.Value;

            if (coordText is null)
            {
                return false;
            }

            // DJI WPML format: longitude,latitude
            var parts = coordText.Split(',');
            var lon = double.Parse(parts[0], CultureInfo.InvariantCulture);
            var lat = double.Parse(parts[1], CultureInfo.InvariantCulture);

            if (Math.Abs(lat - waypoints[i].Latitude) > 1e-5)
            {
                return false;
            }

            if (Math.Abs(lon - waypoints[i].Longitude) > 1e-5)
            {
                return false;
            }

            // Verify index matches position
            var index = placemarks[i].Element(WpmlNs + "index")?.Value;
            if (index is null || int.Parse(index) != i)
            {
                return false;
            }

            // Verify height matches altitude
            var height = placemarks[i].Element(WpmlNs + "height")?.Value;
            if (height is null)
            {
                return false;
            }

            var alt = double.Parse(height, CultureInfo.InvariantCulture);
            if (Math.Abs(alt - waypoints[i].AltitudeAglM) > 1e-1)
            {
                return false;
            }
        }

        return true;
    }
}
