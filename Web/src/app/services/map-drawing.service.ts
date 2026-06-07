import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap, finalize } from 'rxjs';
import { AreaService } from './area.service';
import { SelectionStateService } from './selection-state.service';
import { PolygonValidatorService } from './polygon-validator.service';
import { ValidationResult } from '../models/validation';
import { AreaResponse } from '../api/models/area-response';
import { CreateAreaRequest } from '../api/models/create-area-request';

@Injectable({ providedIn: 'root' })
export class MapDrawingService {
  private readonly areaService = inject(AreaService);
  private readonly selectionState = inject(SelectionStateService);
  private readonly polygonValidator = inject(PolygonValidatorService);

  /** Whether the draw interaction is currently active on the map */
  readonly isDrawing = signal<boolean>(false);

  /** Whether a completed polygon exists on the map */
  readonly hasPolygon = signal<boolean>(false);

  /** Whether a save/submit request is in progress */
  readonly isSubmitting = signal<boolean>(false);

  /** Latest polygon validation result */
  readonly validationResult = signal<ValidationResult | null>(null);

  /** WGS84 outer ring coordinates of the drawn polygon */
  readonly drawnCoordinates = signal<number[][] | null>(null);

  /** Whether the current polygon passes validation */
  readonly isValid = computed(() => this.validationResult()?.isValid ?? false);

  /** Validation error messages (max 5) */
  readonly validationErrors = computed(() => {
    const result = this.validationResult();
    if (!result) return [];
    return result.errors.map(e => e.message).slice(0, 5);
  });

  /** Current toolbar state derived from signals */
  readonly toolbarState = computed<'idle' | 'drawing' | 'polygon-ready' | 'submitting'>(() => {
    if (this.isSubmitting()) return 'submitting';
    if (this.hasPolygon()) return 'polygon-ready';
    if (this.isDrawing()) return 'drawing';
    return 'idle';
  });

  /** Activate draw interaction on the map */
  startDrawing(): void {
    this.isDrawing.set(true);
  }

  /** Cancel the current drawing without saving */
  cancelDrawing(): void {
    this.isDrawing.set(false);
    this.hasPolygon.set(false);
    this.drawnCoordinates.set(null);
    this.validationResult.set(null);
  }

  /** Clear the completed polygon from the map */
  clearPolygon(): void {
    this.hasPolygon.set(false);
    this.drawnCoordinates.set(null);
    this.validationResult.set(null);
  }

  /** Called by the map component when drawing is completed */
  setPolygonCoordinates(coords: number[][]): void {
    this.drawnCoordinates.set(coords);
    this.hasPolygon.set(true);
    this.isDrawing.set(false);

    const result = this.polygonValidator.validate(coords);
    this.validationResult.set(result);
  }

  /** Submit the drawn polygon as a new area */
  submitArea(): Observable<AreaResponse> {
    const coords = this.drawnCoordinates();
    if (!coords) {
      throw new Error('No polygon coordinates to submit');
    }

    const request: CreateAreaRequest = {
      type: 'Polygon',
      coordinates: [coords],
    };

    this.isSubmitting.set(true);

    return this.areaService.createArea(request).pipe(
      tap(response => {
        // Prepend the new area to the cached list
        this.selectionState.areas.update(areas => [response, ...areas]);
        // Select the newly created area
        this.selectionState.selectArea(response.id);
        // Reset drawing state
        this.hasPolygon.set(false);
        this.drawnCoordinates.set(null);
        this.validationResult.set(null);
      }),
      finalize(() => this.isSubmitting.set(false))
    );
  }
}
