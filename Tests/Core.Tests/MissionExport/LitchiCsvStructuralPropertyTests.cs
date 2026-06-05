using System.Text;
using DroneMesh3D.Core.FlightPath;
using DroneMesh3D.Core.MissionExport;
using FsCheck.Xunit;

namespace DroneMesh3D.Core.Tests.MissionExport;

/// <summary>
///     Feature: mission-file-generation, Property 2: CSV structural correctness
///     **Validates: Requirements 3.1, 3.6, 7.1**
/// </summary>
public sealed class LitchiCsvStructuralPropertyTests
{
    private static readonly string[] ExpectedColumns =
    [
        "latitude", "longitude", "altitude(m)", "heading(deg)", "curvesize(m)",
        "rotationdir", "gimbalmode", "gimbalpitchangle", "actiontype1", "actionparam1", "speed(m/s)"
    ];

    private readonly LitchiCsvGenerator _sut = new();

    /// <summary>
    ///     Feature: mission-file-generation, Property 2: CSV structural correctness
    ///     **Validates: Requirements 3.1, 3.6, 7.1**
    ///     Property: For any non-empty list of valid waypoints, the generated Litchi CSV SHALL have
    ///     a header row with exactly 11 columns matching the specified names, every data row SHALL
    ///     have exactly the same number of columns as the header, the file SHALL use comma separators,
    ///     and the byte content SHALL be UTF-8 encoded without a BOM prefix.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(WaypointListArbitrary)])]
    public bool CsvStructure_HeaderHas11CorrectColumns_AllRowsMatch_Utf8NoBom(
        IReadOnlyList<Waypoint> waypoints)
    {
        var result = _sut.Generate(Guid.NewGuid(), waypoints);

        // Verify UTF-8 without BOM
        var hasNoBom = result.Content.Length < 3 ||
                       !(result.Content[0] == 0xEF && result.Content[1] == 0xBB && result.Content[2] == 0xBF);

        // Decode as UTF-8
        var text = Encoding.UTF8.GetString(result.Content);
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        // Header row validation
        var headerColumns = lines[0].Split(',');
        var headerHas11Columns = headerColumns.Length == 11;
        var headerNamesMatch = headerColumns.SequenceEqual(ExpectedColumns);

        // Data row validation: each row has exactly 11 comma-separated columns
        var allDataRowsHave11Columns = lines.Skip(1).All(line => line.Split(',').Length == 11);

        // Row count: header + one row per waypoint
        var correctRowCount = lines.Length == waypoints.Count + 1;

        return hasNoBom && headerHas11Columns && headerNamesMatch &&
               allDataRowsHave11Columns && correctRowCount;
    }
}
