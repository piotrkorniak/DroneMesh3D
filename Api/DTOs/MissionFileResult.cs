namespace DroneMesh3D.Api.DTOs;

public sealed record MissionFileResult(
    byte[] Content,
    string ContentType,
    string FileName);
