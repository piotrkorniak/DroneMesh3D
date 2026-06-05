using DroneMesh3D.Core.MissionExport;
using FsCheck;
using FsCheck.Fluent;
using FsCheck.Xunit;

namespace DroneMesh3D.Core.Tests.MissionExport;

/// <summary>
///     Feature: mission-file-generation, Property 6: Invalid format rejection
///     **Validates: Requirements 2.2**
/// </summary>
public sealed class InvalidFormatPropertyTests
{
    private readonly MissionFileGeneratorFactory _factory = new(
    [
        new LitchiCsvGenerator(),
        new KmlGenerator(),
        new DjiWpmlGenerator()
    ]);

    /// <summary>
    ///     Feature: mission-file-generation, Property 6: Invalid format rejection
    ///     **Validates: Requirements 2.2**
    ///     Property: For any integer value that does not correspond to a valid ExportFormat enum value
    ///     (0=LitchiCsv, 1=Kml, 2=DjiWpml), calling GetGenerator on the factory should throw
    ///     ArgumentOutOfRangeException.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(InvalidExportFormatArbitrary)])]
    public bool InvalidFormat_ThrowsArgumentOutOfRangeException(ExportFormat invalidFormat)
    {
        try
        {
            _factory.GetGenerator(invalidFormat);
            return false; // Should have thrown
        }
        catch (ArgumentOutOfRangeException)
        {
            return true;
        }
    }

    /// <summary>
    ///     Generates ExportFormat values from integers outside the valid range (0, 1, 2).
    ///     Produces values in ranges: negative integers and integers >= 3.
    /// </summary>
    public sealed class InvalidExportFormatArbitrary
    {
        public static Arbitrary<ExportFormat> Generate()
        {
            // Generate integers outside valid enum range [0, 2]
            var negativeValues = Gen.Choose(-100, -1);
            var highValues = Gen.Choose(3, 100);
            var invalidInt = Gen.OneOf(negativeValues, highValues);
            var gen = invalidInt.Select(i => (ExportFormat)i);
            return gen.ToArbitrary();
        }
    }
}
