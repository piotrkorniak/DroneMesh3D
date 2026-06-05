namespace DroneMesh3D.Core.MissionExport;

/// <summary>
///     Fixed values used across mission file generators.
/// </summary>
public static class MissionConstants
{
    public const double MaxSpeedMs = 15.0;
    public const int LitchiGimbalMode = 0; // Manual control
    public const int LitchiActionTypeTakePhoto = 1;
    public const int LitchiActionParam = 0;
    public const int LitchiCurveSize = 0;
    public const int LitchiRotationDir = 0;
    public const double DjiTakeOffSecurityHeight = 20.0;
    public const string DjiFlyToWaylineMode = "safely";
    public const string DjiFinishAction = "goHome";
    public const string DjiExitOnRCLost = "executeLostAction";
    public const string DjiExecuteRCLostAction = "hover";
}
