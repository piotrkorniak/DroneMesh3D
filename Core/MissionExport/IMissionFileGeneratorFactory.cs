namespace DroneMesh3D.Core.MissionExport;

/// <summary>
///     Resolves the appropriate mission file generator for a given export format.
/// </summary>
public interface IMissionFileGeneratorFactory
{
    /// <summary>
    ///     Gets the generator that produces mission files in the specified format.
    /// </summary>
    /// <param name="format">The desired export format.</param>
    /// <returns>The generator for the specified format.</returns>
    /// <exception cref="ArgumentOutOfRangeException">Thrown when no generator is registered for the specified format.</exception>
    IMissionFileGenerator GetGenerator(ExportFormat format);
}
