using System.Globalization;
using System.Text;
using System.Xml.Linq;
using DroneMesh3D.Core.FlightPath;
using DroneMesh3D.Core.MissionExport;
using FsCheck.Xunit;

namespace DroneMesh3D.Core.Tests.MissionExport;

/// <summary>
///     Property 3: KML round-trip structural validity.
///     **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 7.2, 7.4**
///     For any non-empty list of N valid waypoints, the generated KML SHALL parse as
///     well-formed XML with namespace http://www.opengis.net/kml/2.2, contain a Document
///     element with exactly N Placemark children, where each Placemark's Point coordinates
///     are in longitude,latitude,altitude order matching the original waypoint, and
///     ExtendedData contains gimbalPitch, gimbalYaw, action=TakePhoto, and speed=15.
/// </summary>
public sealed class KmlRoundTripPropertyTests
{
    private static readonly XNamespace KmlNs = "http://www.opengis.net/kml/2.2";
    private readonly KmlGenerator _sut = new();

    /// <summary>
    ///     **Validates: Requirements 4.1, 7.2**
    ///     Property: Generated KML parses as well-formed XML with root element 'kml'
    ///     in namespace http://www.opengis.net/kml/2.2.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool GeneratedKml_IsWellFormedXml_WithCorrectNamespace(IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        var doc = XDocument.Parse(Encoding.UTF8.GetString(result.Content));

        // Root element must be 'kml' in the KML 2.2 namespace
        if (doc.Root == null)
        {
            return false;
        }

        if (doc.Root.Name != KmlNs + "kml")
        {
            return false;
        }

        return true;
    }

    /// <summary>
    ///     **Validates: Requirements 4.2, 7.4**
    ///     Property: The Document element contains exactly N Placemark children
    ///     where N equals the number of input waypoints.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool Document_ContainsExactlyNPlacemarks(IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        var doc = XDocument.Parse(Encoding.UTF8.GetString(result.Content));
        var document = doc.Root!.Element(KmlNs + "Document");

        if (document == null)
        {
            return false;
        }

        var placemarks = document.Elements(KmlNs + "Placemark").ToList();

        return placemarks.Count == waypoints.Count;
    }

    /// <summary>
    ///     **Validates: Requirements 4.3**
    ///     Property: Each Placemark's Point/coordinates is in longitude,latitude,altitude
    ///     order matching the original waypoint values.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool Placemarks_HaveCorrectCoordinates_InLonLatAltOrder(IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        var doc = XDocument.Parse(Encoding.UTF8.GetString(result.Content));
        var placemarks = doc.Root!
            .Element(KmlNs + "Document")!
            .Elements(KmlNs + "Placemark")
            .ToList();

        for (var i = 0; i < waypoints.Count; i++)
        {
            var point = placemarks[i].Element(KmlNs + "Point");
            if (point == null)
            {
                return false;
            }

            var coordsElement = point.Element(KmlNs + "coordinates");
            if (coordsElement == null)
            {
                return false;
            }

            var coordsText = coordsElement.Value;
            var parts = coordsText.Split(',');

            if (parts.Length != 3)
            {
                return false;
            }

            // KML spec: longitude,latitude,altitude
            var lon = double.Parse(parts[0], CultureInfo.InvariantCulture);
            var lat = double.Parse(parts[1], CultureInfo.InvariantCulture);
            var alt = double.Parse(parts[2], CultureInfo.InvariantCulture);

            if (Math.Abs(lon - waypoints[i].Longitude) > 1e-6)
            {
                return false;
            }

            if (Math.Abs(lat - waypoints[i].Latitude) > 1e-6)
            {
                return false;
            }

            if (Math.Abs(alt - waypoints[i].AltitudeAglM) > 1e-6)
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>
    ///     **Validates: Requirements 4.4**
    ///     Property: Each Placemark's ExtendedData contains gimbalPitch, gimbalYaw,
    ///     action=TakePhoto, and speed=15 matching the original waypoint.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool Placemarks_HaveCorrectExtendedData(IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        var doc = XDocument.Parse(Encoding.UTF8.GetString(result.Content));
        var placemarks = doc.Root!
            .Element(KmlNs + "Document")!
            .Elements(KmlNs + "Placemark")
            .ToList();

        for (var i = 0; i < waypoints.Count; i++)
        {
            var extendedData = placemarks[i].Element(KmlNs + "ExtendedData");
            if (extendedData == null)
            {
                return false;
            }

            var dataElements = extendedData.Elements(KmlNs + "Data").ToList();

            // Must have gimbalPitch, gimbalYaw, action, speed
            var gimbalPitch = dataElements.FirstOrDefault(d => d.Attribute("name")?.Value == "gimbalPitch");
            var gimbalYaw = dataElements.FirstOrDefault(d => d.Attribute("name")?.Value == "gimbalYaw");
            var action = dataElements.FirstOrDefault(d => d.Attribute("name")?.Value == "action");
            var speed = dataElements.FirstOrDefault(d => d.Attribute("name")?.Value == "speed");

            if (gimbalPitch == null || gimbalYaw == null || action == null || speed == null)
            {
                return false;
            }

            // Validate gimbalPitch value matches waypoint
            var pitchValue = double.Parse(gimbalPitch.Element(KmlNs + "value")!.Value, CultureInfo.InvariantCulture);
            if (Math.Abs(pitchValue - waypoints[i].GimbalPitchDegrees) > 1e-6)
            {
                return false;
            }

            // Validate gimbalYaw value matches waypoint
            var yawValue = double.Parse(gimbalYaw.Element(KmlNs + "value")!.Value, CultureInfo.InvariantCulture);
            if (Math.Abs(yawValue - waypoints[i].GimbalYawDegrees) > 1e-6)
            {
                return false;
            }

            // Validate action is TakePhoto
            if (action.Element(KmlNs + "value")!.Value != "TakePhoto")
            {
                return false;
            }

            // Validate speed is 15
            var speedValue = double.Parse(speed.Element(KmlNs + "value")!.Value, CultureInfo.InvariantCulture);
            if (Math.Abs(speedValue - 15.0) > 1e-6)
            {
                return false;
            }
        }

        return true;
    }
}
