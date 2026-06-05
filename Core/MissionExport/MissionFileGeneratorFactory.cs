namespace DroneMesh3D.Core.MissionExport;

/// <summary>
///     Resolves generators from DI-injected <see cref="IEnumerable{IMissionFileGenerator}" />
///     into a dictionary keyed by <see cref="ExportFormat" />.
/// </summary>
public sealed class MissionFileGeneratorFactory(
    IEnumerable<IMissionFileGenerator> generators) : IMissionFileGeneratorFactory
{
    private readonly Dictionary<ExportFormat, IMissionFileGenerator> _generators =
        generators.ToDictionary(g => g.Format);

    /// <inheritdoc />
    public IMissionFileGenerator GetGenerator(ExportFormat format) =>
        _generators.TryGetValue(format, out var generator)
            ? generator
            : throw new ArgumentOutOfRangeException(nameof(format), $"No generator for format: {format}");
}
