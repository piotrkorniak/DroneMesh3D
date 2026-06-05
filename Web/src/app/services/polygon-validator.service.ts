import { Injectable } from '@angular/core';
import { ValidationError, ValidationResult, ValidationRule } from '../models/validation';

@Injectable({ providedIn: 'root' })
export class PolygonValidatorService {
  private readonly MAX_AREA_HECTARES = 5;
  private readonly MIN_AREA_SQM = 100;

  validate(coordinates: number[][]): ValidationResult {
    const errors: ValidationError[] = [];

    if (!this.hasMinVertices(coordinates)) {
      errors.push({
        rule: ValidationRule.MinVertices,
        message: 'Polygon must have at least 3 vertices.',
      });
    }

    if (!this.isClosed(coordinates)) {
      errors.push({
        rule: ValidationRule.Closure,
        message: 'Polygon must be closed (first and last vertex must be identical).',
      });
    }

    if (this.hasSelfIntersection(coordinates)) {
      errors.push({
        rule: ValidationRule.SelfIntersection,
        message: 'Polygon edges must not cross each other.',
      });
    }

    const areaSqm = this.calculateAreaSqm(coordinates);

    if (areaSqm > this.MAX_AREA_HECTARES * 10000) {
      errors.push({
        rule: ValidationRule.AreaTooLarge,
        message: `Polygon area must not exceed ${this.MAX_AREA_HECTARES} hectares.`,
      });
    }

    if (areaSqm < this.MIN_AREA_SQM) {
      errors.push({
        rule: ValidationRule.AreaTooSmall,
        message: `Polygon area must be at least ${this.MIN_AREA_SQM} square meters.`,
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  hasMinVertices(coordinates: number[][]): boolean {
    const distinctCount = this.isClosed(coordinates)
      ? coordinates.length - 1
      : coordinates.length;
    return distinctCount >= 3;
  }

  isClosed(coordinates: number[][]): boolean {
    if (coordinates.length < 2) return false;
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  }

  hasSelfIntersection(coordinates: number[][]): boolean {
    const n = coordinates.length;
    if (n < 4) return false;

    // Number of edges: if polygon is closed, last edge connects last-1 to first (same as last point)
    // For a closed polygon with n points, there are n-1 edges
    // For an open polygon with n points, there are n-1 edges
    const edgeCount = n - 1;

    for (let i = 0; i < edgeCount; i++) {
      for (let j = i + 2; j < edgeCount; j++) {
        // Skip adjacent edges (first and last edge are adjacent in a closed polygon)
        if (i === 0 && j === edgeCount - 1 && this.isClosed(coordinates)) {
          continue;
        }

        if (
          this.segmentsIntersect(
            coordinates[i],
            coordinates[i + 1],
            coordinates[j],
            coordinates[j + 1]
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  calculateAreaSqm(coordinates: number[][]): number {
    if (coordinates.length < 3) return 0;

    // Coordinates are [longitude, latitude] in degrees
    const EARTH_RADIUS = 6371008.8; // meters

    // Get the ring without the closing point if it's closed
    const ring = this.isClosed(coordinates)
      ? coordinates.slice(0, -1)
      : coordinates;

    if (ring.length < 3) return 0;

    return this.computeSphericalArea(ring, EARTH_RADIUS);
  }

  private computeSphericalArea(ring: number[][], earthRadius: number): number {
    // Implementation of the spherical polygon area using the surveyor's formula
    // adapted for spherical coordinates (similar to what OpenLayers uses)
    const toRad = (deg: number): number => (deg * Math.PI) / 180;
    const n = ring.length;

    if (n < 3) return 0;

    // Use the formula: A = R² * |Σ (λ_{i+1} - λ_{i-1}) * sin(φ_i)|
    // This is the spherical version of the shoelface formula
    let sum = 0;

    for (let i = 0; i < n; i++) {
      const prev = (i + n - 1) % n;
      const next = (i + 1) % n;

      const lonPrev = toRad(ring[prev][0]);
      const lonNext = toRad(ring[next][0]);
      const latCurr = toRad(ring[i][1]);

      sum += (lonNext - lonPrev) * Math.sin(latCurr);
    }

    return Math.abs(sum * earthRadius * earthRadius * 0.5);
  }

  /**
   * Checks if two line segments (p1-p2) and (p3-p4) properly intersect
   * (not just touch at endpoints).
   */
  private segmentsIntersect(
    p1: number[],
    p2: number[],
    p3: number[],
    p4: number[]
  ): boolean {
    const d1 = this.crossProduct(p3, p4, p1);
    const d2 = this.crossProduct(p3, p4, p2);
    const d3 = this.crossProduct(p1, p2, p3);
    const d4 = this.crossProduct(p1, p2, p4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }

    // Check collinear cases
    if (d1 === 0 && this.onSegment(p3, p4, p1)) return true;
    if (d2 === 0 && this.onSegment(p3, p4, p2)) return true;
    if (d3 === 0 && this.onSegment(p1, p2, p3)) return true;
    if (d4 === 0 && this.onSegment(p1, p2, p4)) return true;

    return false;
  }

  /**
   * Computes the cross product of vectors (b - a) and (c - a).
   * Positive if c is to the left of ab, negative if to the right, 0 if collinear.
   */
  private crossProduct(a: number[], b: number[], c: number[]): number {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }

  /**
   * Checks if point p lies on segment (a, b), assuming collinearity.
   */
  private onSegment(a: number[], b: number[], p: number[]): boolean {
    return (
      Math.min(a[0], b[0]) <= p[0] &&
      p[0] <= Math.max(a[0], b[0]) &&
      Math.min(a[1], b[1]) <= p[1] &&
      p[1] <= Math.max(a[1], b[1])
    );
  }
}
