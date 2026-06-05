using System.Globalization;
using System.IO.Compression;
using System.Xml.Linq;
using DroneMesh3D.Core.FlightPath;
using DroneMesh3D.Core.MissionExport;
using FsCheck.Xunit;

namespace DroneMesh3D.Core.Tests.MissionExport;

/// <summary>
///     Feature: mission-file-generation, Property 4: KMZ structural round-trip
///     **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.5, 7.6**
/// </summary>
public sealed class DjiWpmlRoundTripPropertyTests
{
    private static readonly XNamespace KmlNs = "http://www.opengis.net/kml/2.2";
    private static readonly XNamespace WpmlNs = "http://www.dji.com/wpmz/1.0.2";

    private readonly DjiWpmlGenerator _sut = new();

    /// <summary>
    ///     Property 4: KMZ structural round-trip — Archive contains exactly two entries named
    ///     template.kml and waylines.wpml.
    ///     **Validates: Requirements 5.1**
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool KmzArchive_ContainsExactlyTwoExpectedEntries(IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        using var stream = new MemoryStream(result.Content);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var entryNames = archive.Entries.Select(e => e.FullName).OrderBy(n => n).ToList();

        return entryNames.Count == 2 &&
               entryNames.Contains("template.kml") &&
               entryNames.Contains("waylines.wpml");
    }

    /// <summary>
    ///     Property 4: KMZ structural round-trip — Both entries are parseable as valid XML.
    ///     **Validates: Requirements 5.7, 7.5**
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool KmzArchive_BothEntriesAreValidXml(IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        using var stream = new MemoryStream(result.Content);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var templateEntry = archive.GetEntry("template.kml")!;
        var waylinesEntry = archive.GetEntry("waylines.wpml")!;

        using var templateStream = templateEntry.Open();
        var templateDoc = XDocument.Load(templateStream);

        using var waylinesStream = waylinesEntry.Open();
        var waylinesDoc = XDocument.Load(waylinesStream);

        return templateDoc.Root != null && waylinesDoc.Root != null;
    }

    /// <summary>
    ///     Property 4: KMZ structural round-trip — template.kml declares both KML and WPML namespaces.
    ///     **Validates: Requirements 5.2**
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool TemplateKml_DeclaresBothNamespaces(IReadOnlyList<Waypoint> waypoints)
    {
        var templateDoc = GetTemplateKml(waypoints);
        var root = templateDoc.Root!;

        var hasKmlNs = root.Name.Namespace == KmlNs;
        var hasWpmlNs = root.Attributes()
            .Any(a => a.IsNamespaceDeclaration && a.Value == WpmlNs.NamespaceName);

        return hasKmlNs && hasWpmlNs;
    }

    /// <summary>
    ///     Property 4: KMZ structural round-trip — template.kml contains missionConfig with correct fixed values.
    ///     **Validates: Requirements 5.3**
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool TemplateKml_MissionConfigHasCorrectFixedValues(IReadOnlyList<Waypoint> waypoints)
    {
        var templateDoc = GetTemplateKml(waypoints);
        var document = templateDoc.Root!.Element(KmlNs + "Document")!;
        var missionConfig = document.Element(WpmlNs + "missionConfig")!;

        var flyToWaylineMode = missionConfig.Element(WpmlNs + "flyToWaylineMode")?.Value;
        var finishAction = missionConfig.Element(WpmlNs + "finishAction")?.Value;
        var exitOnRCLost = missionConfig.Element(WpmlNs + "exitOnRCLost")?.Value;
        var executeRCLostAction = missionConfig.Element(WpmlNs + "executeRCLostAction")?.Value;
        var takeOffSecurityHeight = missionConfig.Element(WpmlNs + "takeOffSecurityHeight")?.Value;
        var globalTransitionalSpeed = missionConfig.Element(WpmlNs + "globalTransitionalSpeed")?.Value;

        return flyToWaylineMode == MissionConstants.DjiFlyToWaylineMode &&
               finishAction == MissionConstants.DjiFinishAction &&
               exitOnRCLost == MissionConstants.DjiExitOnRCLost &&
               executeRCLostAction == MissionConstants.DjiExecuteRCLostAction &&
               takeOffSecurityHeight == MissionConstants.DjiTakeOffSecurityHeight.ToString("F0", CultureInfo.InvariantCulture) &&
               globalTransitionalSpeed == MissionConstants.MaxSpeedMs.ToString("F0", CultureInfo.InvariantCulture);
    }

    /// <summary>
    ///     Property 4: KMZ structural round-trip — template.kml contains exactly N Placemarks with correct
    ///     coordinates, index, height, and gimbalPitchAngle.
    ///     **Validates: Requirements 5.5, 7.6**
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool TemplateKml_ContainsNPlacemarksWithCorrectData(IReadOnlyList<Waypoint> waypoints)
    {
        var templateDoc = GetTemplateKml(waypoints);
        var document = templateDoc.Root!.Element(KmlNs + "Document")!;
        var folder = document.Element(KmlNs + "Folder")!;
        var placemarks = folder.Elements(KmlNs + "Placemark").ToList();

        if (placemarks.Count != waypoints.Count)
        {
            return false;
        }

        for (var i = 0; i < waypoints.Count; i++)
        {
            var placemark = placemarks[i];
            var wp = waypoints[i];

            var coordinates = placemark.Element(KmlNs + "Point")?.Element(KmlNs + "coordinates")?.Value;
            var expectedCoordinates = string.Format(CultureInfo.InvariantCulture, "{0},{1}",
                wp.Longitude, wp.Latitude);
            if (coordinates != expectedCoordinates)
            {
                return false;
            }

            var index = placemark.Element(WpmlNs + "index")?.Value;
            if (index != i.ToString())
            {
                return false;
            }

            var height = placemark.Element(WpmlNs + "height")?.Value;
            var expectedHeight = wp.AltitudeAglM.ToString("F2", CultureInfo.InvariantCulture);
            if (height != expectedHeight)
            {
                return false;
            }

            var gimbalPitch = placemark.Element(WpmlNs + "gimbalPitchAngle")?.Value;
            var expectedPitch = wp.GimbalPitchDegrees.ToString("F2", CultureInfo.InvariantCulture);
            if (gimbalPitch != expectedPitch)
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>
    ///     Property 4: KMZ structural round-trip — waylines.wpml contains N waypoint elements each with
    ///     a takePhoto action triggered by reachPoint.
    ///     **Validates: Requirements 5.6**
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool WaylinesWpml_ContainsNWaypointsWithTakePhotoAction(IReadOnlyList<Waypoint> waypoints)
    {
        var waylinesDoc = GetWaylinesWpml(waypoints);
        var document = waylinesDoc.Root!.Element(KmlNs + "Document")!;
        var waypointElements = document.Elements(WpmlNs + "waypoint").ToList();

        if (waypointElements.Count != waypoints.Count)
        {
            return false;
        }

        for (var i = 0; i < waypointElements.Count; i++)
        {
            var wpElement = waypointElements[i];

            var index = wpElement.Element(WpmlNs + "index")?.Value;
            if (index != i.ToString())
            {
                return false;
            }

            var actionGroup = wpElement.Element(WpmlNs + "actionGroup");
            if (actionGroup == null)
            {
                return false;
            }

            var triggerType = actionGroup.Element(WpmlNs + "actionTrigger")
                ?.Element(WpmlNs + "actionTriggerType")?.Value;
            if (triggerType != "reachPoint")
            {
                return false;
            }

            var actionFunc = actionGroup.Element(WpmlNs + "action")
                ?.Element(WpmlNs + "actionActuatorFunc")?.Value;
            if (actionFunc != "takePhoto")
            {
                return false;
            }
        }

        return true;
    }

    private XDocument GetTemplateKml(IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        using var stream = new MemoryStream(result.Content);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var entry = archive.GetEntry("template.kml")!;
        using var entryStream = entry.Open();
        return XDocument.Load(entryStream);
    }

    private XDocument GetWaylinesWpml(IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        using var stream = new MemoryStream(result.Content);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var entry = archive.GetEntry("waylines.wpml")!;
        using var entryStream = entry.Open();
        return XDocument.Load(entryStream);
    }
}
