namespace DroneMesh3D.Core.MissionExport;

/// <summary>
///     Represents the output of a mission file generation operation.
/// </summary>
/// <param name="Content">The raw byte content of the generated file.</param>
/// <param name="ContentType">The MIME content type for the file (e.g., text/csv, application/vnd.google-earth.kml+xml).</param>
/// <param name="FileName">The suggested file name for download (e.g., mission_{id}.csv).</param>
public sealed record MissionFileData(
    byte[] Content,
    string ContentType,
    string FileName);
