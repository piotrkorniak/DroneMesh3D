using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using DroneMesh3D.Core.FlightPath;

namespace DroneMesh3D.Core.MissionExport;

/// <summary>
///     Generates a DJI WPML mission file (KMZ archive) containing template.kml and waylines.wpml.
/// </summary>
public sealed class DjiWpmlGenerator : IMissionFileGenerator
{
    private static readonly XNamespace KmlNs = "http://www.opengis.net/kml/2.2";
    private static readonly XNamespace WpmlNs = "http://www.dji.com/wpmz/1.0.2";

    public ExportFormat Format => ExportFormat.DjiWpml;

    public MissionFileData Generate(Guid flightPlanId, IReadOnlyList<Waypoint> waypoints)
    {
        var templateKml = GenerateTemplateKml(waypoints);
        var waylinesWpml = GenerateWaylinesWpml(waypoints);

        var kmzBytes = PackageKmz(templateKml, waylinesWpml);

        return new MissionFileData(
            kmzBytes,
            "application/vnd.google-earth.kmz",
            $"mission_{flightPlanId}.kmz");
    }

    private static XDocument GenerateTemplateKml(IReadOnlyList<Waypoint> waypoints)
    {
        var placemarks = new List<XElement>(waypoints.Count);

        for (var i = 0; i < waypoints.Count; i++)
        {
            var wp = waypoints[i];
            placemarks.Add(new XElement(KmlNs + "Placemark",
                new XElement(KmlNs + "Point",
                    new XElement(KmlNs + "coordinates",
                        string.Format(CultureInfo.InvariantCulture, "{0},{1}",
                            wp.Longitude, wp.Latitude))),
                new XElement(WpmlNs + "index", i),
                new XElement(WpmlNs + "height",
                    wp.AltitudeAglM.ToString("F2", CultureInfo.InvariantCulture)),
                new XElement(WpmlNs + "gimbalPitchAngle",
                    wp.GimbalPitchDegrees.ToString("F2", CultureInfo.InvariantCulture))));
        }

        var document = new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(KmlNs + "kml",
                new XAttribute(XNamespace.Xmlns + "wpml", WpmlNs),
                new XElement(KmlNs + "Document",
                    new XElement(WpmlNs + "missionConfig",
                        new XElement(WpmlNs + "flyToWaylineMode", MissionConstants.DjiFlyToWaylineMode),
                        new XElement(WpmlNs + "finishAction", MissionConstants.DjiFinishAction),
                        new XElement(WpmlNs + "exitOnRCLost", MissionConstants.DjiExitOnRCLost),
                        new XElement(WpmlNs + "executeRCLostAction", MissionConstants.DjiExecuteRCLostAction),
                        new XElement(WpmlNs + "takeOffSecurityHeight",
                            MissionConstants.DjiTakeOffSecurityHeight.ToString("F0", CultureInfo.InvariantCulture)),
                        new XElement(WpmlNs + "globalTransitionalSpeed",
                            MissionConstants.MaxSpeedMs.ToString("F0", CultureInfo.InvariantCulture))),
                    new XElement(KmlNs + "Folder",
                        new XElement(WpmlNs + "templateType", "waypoint"),
                        new XElement(WpmlNs + "coordinateMode", "WGS84"),
                        new XElement(WpmlNs + "heightMode", "relativeToStartPoint"),
                        new XElement(WpmlNs + "autoFlightSpeed",
                            MissionConstants.MaxSpeedMs.ToString("F0", CultureInfo.InvariantCulture)),
                        new XElement(WpmlNs + "gimbalPitchMode", "usePointSetting"),
                        placemarks))));

        return document;
    }

    private static XDocument GenerateWaylinesWpml(IReadOnlyList<Waypoint> waypoints)
    {
        var waypointElements = new List<XElement>(waypoints.Count);

        for (var i = 0; i < waypoints.Count; i++)
        {
            waypointElements.Add(new XElement(WpmlNs + "waypoint",
                new XElement(WpmlNs + "index", i),
                new XElement(WpmlNs + "actionGroup",
                    new XElement(WpmlNs + "actionTrigger",
                        new XElement(WpmlNs + "actionTriggerType", "reachPoint")),
                    new XElement(WpmlNs + "action",
                        new XElement(WpmlNs + "actionActuatorFunc", "takePhoto")))));
        }

        var document = new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(KmlNs + "kml",
                new XAttribute(XNamespace.Xmlns + "wpml", WpmlNs),
                new XElement(KmlNs + "Document",
                    waypointElements)));

        return document;
    }

    private static byte[] PackageKmz(XDocument templateKml, XDocument waylinesWpml)
    {
        using var memoryStream = new MemoryStream();

        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            WriteXmlEntry(archive, "template.kml", templateKml);
            WriteXmlEntry(archive, "waylines.wpml", waylinesWpml);
        }

        return memoryStream.ToArray();
    }

    private static void WriteXmlEntry(ZipArchive archive, string entryName, XDocument document)
    {
        var entry = archive.CreateEntry(entryName);

        using var entryStream = entry.Open();
        using var writer = new StreamWriter(entryStream, new UTF8Encoding(false));
        writer.Write(document.Declaration + "\n" + document);
    }
}
