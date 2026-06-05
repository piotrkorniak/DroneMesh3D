using System.Globalization;
using System.Text;
using System.Xml.Linq;
using DroneMesh3D.Core.FlightPath;

namespace DroneMesh3D.Core.MissionExport;

/// <summary>
///     Generates a KML 2.2 mission file from waypoints.
/// </summary>
public sealed class KmlGenerator : IMissionFileGenerator
{
    private static readonly XNamespace KmlNs = "http://www.opengis.net/kml/2.2";

    /// <inheritdoc />
    public ExportFormat Format => ExportFormat.Kml;

    /// <inheritdoc />
    public MissionFileData Generate(Guid flightPlanId, IReadOnlyList<Waypoint> waypoints)
    {
        var document = new XElement(KmlNs + "Document",
            new XElement(KmlNs + "name", $"DroneMesh3D Mission - {flightPlanId}"));

        for (var i = 0; i < waypoints.Count; i++)
        {
            document.Add(CreatePlacemark(waypoints[i], i));
        }

        var kml = new XDocument(
            new XDeclaration("1.0", "UTF-8", null),
            new XElement(KmlNs + "kml", document));

        var content = ToUtf8Bytes(kml);

        return new MissionFileData(
            content,
            "application/vnd.google-earth.kml+xml",
            $"mission_{flightPlanId}.kml");
    }

    private XElement CreatePlacemark(Waypoint waypoint, int index)
    {
        var coordinates = string.Format(
            CultureInfo.InvariantCulture,
            "{0},{1},{2}",
            waypoint.Longitude,
            waypoint.Latitude,
            waypoint.AltitudeAglM);

        return new XElement(KmlNs + "Placemark",
            new XElement(KmlNs + "name", $"WP{index}"),
            new XElement(KmlNs + "Point",
                new XElement(KmlNs + "coordinates", coordinates)),
            new XElement(KmlNs + "ExtendedData",
                CreateDataElement("gimbalPitch", waypoint.GimbalPitchDegrees.ToString(CultureInfo.InvariantCulture)),
                CreateDataElement("gimbalYaw", waypoint.GimbalYawDegrees.ToString(CultureInfo.InvariantCulture)),
                CreateDataElement("action", "TakePhoto"),
                CreateDataElement("speed", MissionConstants.MaxSpeedMs.ToString(CultureInfo.InvariantCulture))));
    }

    private static XElement CreateDataElement(string name, string value) =>
        new(KmlNs + "Data",
            new XAttribute("name", name),
            new XElement(KmlNs + "value", value));

    private static byte[] ToUtf8Bytes(XDocument document)
    {
        using var stream = new MemoryStream();
        using var writer = new StreamWriter(stream, new UTF8Encoding(false));
        document.Save(writer);
        writer.Flush();
        return stream.ToArray();
    }
}
