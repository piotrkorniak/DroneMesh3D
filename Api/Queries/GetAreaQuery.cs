namespace DroneMesh3D.Api.Queries;

using DroneMesh3D.Api.DTOs;
using MediatR;

public record GetAreaQuery(Guid Id) : IRequest<AreaResponse?>;
