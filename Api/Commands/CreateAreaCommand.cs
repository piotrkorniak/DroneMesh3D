namespace DroneMesh3D.Api.Commands;

using DroneMesh3D.Api.DTOs;
using MediatR;
using OneOf;

public record CreateAreaCommand(string Type, double[][][] Coordinates)
    : IRequest<OneOf<AreaResponse, ValidationErrorResponse, ErrorResponse>>;
