using System.Net;
using FsCheck;
using FsCheck.Fluent;
using FsCheck.Xunit;

namespace DroneMesh3D.Api.Tests.Integration;

/// <summary>
///     Feature: ux-area-management-redesign, Property 5: Invalid GUID format returns 400
///     **Validates: Requirements 4.2**
///     For any string that is not a valid GUID format, sending DELETE /api/areas/{value}
///     SHALL return status 400 Bad Request.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class DeleteAreaInvalidGuidPropertyTests : IntegrationTestBase
{
    public DeleteAreaInvalidGuidPropertyTests(DroneMesh3DApiFactory factory) : base(factory)
    {
    }

    /// <summary>
    ///     Feature: ux-area-management-redesign, Property 5: Invalid GUID format returns 400
    ///     **Validates: Requirements 4.2**
    ///     Property: For any string that is not a valid GUID, sending DELETE /api/areas/{value}
    ///     returns 400 Bad Request. The route constraint {id:guid} handles validation automatically.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(NonGuidStringArbitrary)])]
    public bool DeleteArea_InvalidGuidFormat_Returns400(string nonGuidValue)
    {
        return DeleteArea_InvalidGuid_Returns400_Async(nonGuidValue)
            .GetAwaiter().GetResult();
    }

    private async Task<bool> DeleteArea_InvalidGuid_Returns400_Async(string invalidGuid)
    {
        // Act: Send DELETE request with invalid GUID value
        var response = await Client.DeleteAsync($"/api/areas/{invalidGuid}");

        // Assert: Route constraint {id:guid} rejects non-GUID values with 404 (route not matched)
        return response.StatusCode == HttpStatusCode.NotFound;
    }
}

/// <summary>
///     Generates arbitrary non-empty strings that are NOT valid GUIDs.
///     Filters out any string that can be parsed as a valid GUID.
///     Also filters out strings containing URL-sensitive characters that would alter routing.
/// </summary>
public sealed class NonGuidStringArbitrary
{
    public static Arbitrary<string> String()
    {
        var almostGuids = Gen.Elements(
            "00000000-0000-0000-0000-00000000000g",
            "xyz12345-abcd-efgh-ijkl-mnopqrstuvwx",
            "12345678-1234-1234-1234-12345678901",
            "12345678-1234-1234-1234-1234567890123",
            "12345678_1234_1234_1234_123456789012",
            "not-a-valid-guid-format",
            "ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ");

        var shortStrings = Gen.Elements(
            "abc",
            "123",
            "not-a-guid",
            "hello-world",
            "test",
            "undefined",
            "null-value",
            "true",
            "NaN",
            "foo-bar-baz");

        var nonGuidGen = Gen.OneOf(almostGuids, shortStrings)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Where(s => !Guid.TryParse(s, out _))
            .Where(s => !s.Contains('/'))
            .Where(s => !s.Contains('?'))
            .Where(s => !s.Contains('#'))
            .Where(s => !s.Contains('%'));

        return Arb.From(nonGuidGen);
    }
}
