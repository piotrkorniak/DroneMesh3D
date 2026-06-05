using DroneMesh3D.Api.Queries;
using FluentValidation;

namespace DroneMesh3D.Api.Validators;

public sealed class ExportMissionFileQueryValidator : AbstractValidator<ExportMissionFileQuery>
{
    public ExportMissionFileQueryValidator()
    {
        RuleFor(x => x.FlightPlanId)
            .NotEqual(Guid.Empty)
            .WithMessage("FlightPlanId must not be empty.");

        RuleFor(x => x.Format)
            .IsInEnum()
            .WithMessage("Format must be one of: LitchiCsv, Kml, DjiWpml");
    }
}
