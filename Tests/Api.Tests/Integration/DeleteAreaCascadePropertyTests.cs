using System.Net;
using DroneMesh3D.Core.Data;
using FsCheck;
using FsCheck.Fluent;
using FsCheck.Xunit;
using Microsoft.Extensions.DependencyInjection;

namespace DroneMesh3D.Api.Tests.Integration;

/// <summary>
///     Feature: ux-area-management-redesign, Property 4: DELETE area endpoint correctness with cascade
///     **Validates: Requirements 4.1, 4.4**
///     For any existing area (with 0..N associated flight plans), sending DELETE /api/areas/{id}
///     SHALL return status 204, and afterwards neither the area nor any of its previously associated
///     flight plans SHALL exist in the database.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class DeleteAreaCascadePropertyTests : IntegrationTestBase
{
    public DeleteAreaCascadePropertyTests(DroneMesh3DApiFactory factory) : base(factory)
    {
    }

    /// <summary>
    ///     Feature: ux-area-management-redesign, Property 4: DELETE area endpoint correctness with cascade
    ///     **Validates: Requirements 4.1, 4.4**
    ///     Property: For any area with 0–10 associated flight plans, DELETE /api/areas/{id}
    ///     returns 204 and removes both the area and all its flight plans from the database.
    /// </summary>
    [Property(MaxTest = 100, Arbitrary = [typeof(FlightPlanCountArbitrary)])]
    public bool DeleteArea_RemovesAreaAndAllAssociatedFlightPlans(int planCount)
    {
        return DeleteArea_RemovesAreaAndAllPlans_Async(planCount)
            .GetAwaiter().GetResult();
    }

    private async Task<bool> DeleteArea_RemovesAreaAndAllPlans_Async(int planCount)
    {
        // Arrange: Clean DB state for isolation between iterations
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.FlightPlans.RemoveRange(db.FlightPlans);
            db.Areas.RemoveRange(db.Areas);
            await db.SaveChangesAsync();
        }

        // Create an area
        var areaId = await CreateAreaAsync();

        // Create the specified number of flight plans for this area
        var planIds = new List<Guid>();
        for (var i = 0; i < planCount; i++)
        {
            var plan = await CreateFlightPlanAsync(areaId);
            planIds.Add(plan.Id);
        }

        // Act: Send DELETE request
        var deleteResponse = await Client.DeleteAsync($"/api/areas/{areaId}");

        // Assert: Response is 204 No Content
        if (deleteResponse.StatusCode != HttpStatusCode.NoContent)
        {
            return false;
        }

        // Assert: Area no longer exists in the database
        var getAreaResponse = await Client.GetAsync($"/api/areas/{areaId}");
        if (getAreaResponse.StatusCode != HttpStatusCode.NotFound)
        {
            return false;
        }

        // Assert: All associated flight plans no longer exist in the database
        foreach (var planId in planIds)
        {
            var getPlanResponse = await Client.GetAsync($"/api/flight-plans/{planId}");
            if (getPlanResponse.StatusCode != HttpStatusCode.NotFound)
            {
                return false;
            }
        }

        return true;
    }
}

/// <summary>
///     Generates flight plan count values in the range [0, 10].
/// </summary>
public sealed class FlightPlanCountArbitrary
{
    public static Arbitrary<int> Int32() => Arb.From(Gen.Choose(0, 10));
}
