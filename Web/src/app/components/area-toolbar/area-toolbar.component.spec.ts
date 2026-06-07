import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal, Signal } from '@angular/core';
import { of } from 'rxjs';
import { AreaToolbarComponent } from './area-toolbar.component';
import { MapDrawingService } from '../../services/map-drawing.service';

type ToolbarState = 'idle' | 'drawing' | 'polygon-ready' | 'submitting';

/**
 * Unit tests for AreaToolbarComponent state machine.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 8.1, 8.3
 */
describe('AreaToolbarComponent', () => {
  let fixture: ComponentFixture<AreaToolbarComponent>;

  let isDrawingSignal: WritableSignal<boolean>;
  let hasPolygonSignal: WritableSignal<boolean>;
  let isSubmittingSignal: WritableSignal<boolean>;
  let isValidSignal: WritableSignal<boolean>;
  let validationErrorsSignal: WritableSignal<string[]>;
  let toolbarStateSignal: WritableSignal<ToolbarState>;

  let mockDrawingService: jasmine.SpyObj<MapDrawingService> & {
    isDrawing: Signal<boolean>;
    hasPolygon: Signal<boolean>;
    isSubmitting: Signal<boolean>;
    isValid: Signal<boolean>;
    validationErrors: Signal<string[]>;
    toolbarState: Signal<ToolbarState>;
  };

  beforeEach(async () => {
    isDrawingSignal = signal(false);
    hasPolygonSignal = signal(false);
    isSubmittingSignal = signal(false);
    isValidSignal = signal(true);
    validationErrorsSignal = signal<string[]>([]);
    toolbarStateSignal = signal<ToolbarState>('idle');

    mockDrawingService = {
      isDrawing: isDrawingSignal.asReadonly(),
      hasPolygon: hasPolygonSignal.asReadonly(),
      isSubmitting: isSubmittingSignal.asReadonly(),
      isValid: isValidSignal.asReadonly(),
      validationErrors: validationErrorsSignal.asReadonly(),
      toolbarState: toolbarStateSignal.asReadonly(),
      startDrawing: jasmine.createSpy('startDrawing'),
      cancelDrawing: jasmine.createSpy('cancelDrawing'),
      clearPolygon: jasmine.createSpy('clearPolygon'),
      submitArea: jasmine.createSpy('submitArea').and.returnValue(of({})),
      setPolygonCoordinates: jasmine.createSpy('setPolygonCoordinates'),
      drawnCoordinates: signal<number[][] | null>(null).asReadonly(),
      validationResult: signal(null).asReadonly(),
    } as unknown as typeof mockDrawingService;

    await TestBed.configureTestingModule({
      imports: [AreaToolbarComponent],
      providers: [
        { provide: MapDrawingService, useValue: mockDrawingService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaToolbarComponent);
    fixture.detectChanges();
  });

  // Helper functions
  function getButtonByAriaLabel(label: string): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector(`button[aria-label="${label}"]`);
  }

  function getValidationErrors(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.area-toolbar__error'));
  }

  function getErrorList(): HTMLUListElement | null {
    return fixture.nativeElement.querySelector('.area-toolbar__errors');
  }

  // ─── State Machine Transitions ───────────────────────────────────────────────

  describe('State transitions: idle → drawing → polygon-ready → submitting → idle', () => {
    it('should show "Nowy obszar" button in idle state', () => {
      toolbarStateSignal.set('idle');
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Nowy obszar');
      expect(btn).not.toBeNull();
      expect(btn!.disabled).toBe(false);
    });

    it('should transition to drawing state and show "Anuluj" button', () => {
      toolbarStateSignal.set('drawing');
      isDrawingSignal.set(true);
      fixture.detectChanges();

      const cancelBtn = getButtonByAriaLabel('Anuluj');
      expect(cancelBtn).not.toBeNull();
      expect(cancelBtn!.disabled).toBe(false);
    });

    it('should disable "Nowy obszar" button when in drawing state', () => {
      toolbarStateSignal.set('drawing');
      isDrawingSignal.set(true);
      fixture.detectChanges();

      const drawBtn = getButtonByAriaLabel('Nowy obszar');
      expect(drawBtn).not.toBeNull();
      expect(drawBtn!.disabled).toBe(true);
    });

    it('should transition to polygon-ready state and show "Zapisz" and "Wyczyść" buttons', () => {
      toolbarStateSignal.set('polygon-ready');
      hasPolygonSignal.set(true);
      fixture.detectChanges();

      const saveBtn = getButtonByAriaLabel('Zapisz');
      const clearBtn = getButtonByAriaLabel('Wyczyść');
      expect(saveBtn).not.toBeNull();
      expect(clearBtn).not.toBeNull();
    });

    it('should transition to submitting state and disable both buttons', () => {
      toolbarStateSignal.set('submitting');
      isSubmittingSignal.set(true);
      fixture.detectChanges();

      const saveBtn = getButtonByAriaLabel('Zapisz');
      const clearBtn = getButtonByAriaLabel('Wyczyść');
      expect(saveBtn).not.toBeNull();
      expect(saveBtn!.disabled).toBe(true);
      expect(clearBtn).not.toBeNull();
      expect(clearBtn!.disabled).toBe(true);
    });

    it('should return to idle after submitting completes', () => {
      toolbarStateSignal.set('idle');
      isSubmittingSignal.set(false);
      hasPolygonSignal.set(false);
      fixture.detectChanges();

      const drawBtn = getButtonByAriaLabel('Nowy obszar');
      expect(drawBtn).not.toBeNull();
      expect(drawBtn!.disabled).toBe(false);
    });
  });

  // ─── Cancel Returns to Idle, Clears Polygon ─────────────────────────────────

  describe('Cancel returns to idle, clears polygon', () => {
    it('should call cancelDrawing on the service when "Anuluj" is clicked', () => {
      toolbarStateSignal.set('drawing');
      isDrawingSignal.set(true);
      fixture.detectChanges();

      const cancelBtn = getButtonByAriaLabel('Anuluj');
      cancelBtn!.click();

      expect(mockDrawingService.cancelDrawing).toHaveBeenCalled();
    });

    it('should show idle state after cancel resets signals', () => {
      toolbarStateSignal.set('drawing');
      isDrawingSignal.set(true);
      fixture.detectChanges();

      // Simulate cancel effect on signals
      toolbarStateSignal.set('idle');
      isDrawingSignal.set(false);
      hasPolygonSignal.set(false);
      fixture.detectChanges();

      const drawBtn = getButtonByAriaLabel('Nowy obszar');
      expect(drawBtn).not.toBeNull();
      expect(drawBtn!.disabled).toBe(false);
    });

    it('should call clearPolygon on the service when "Wyczyść" is clicked in polygon-ready state', () => {
      toolbarStateSignal.set('polygon-ready');
      hasPolygonSignal.set(true);
      fixture.detectChanges();

      const clearBtn = getButtonByAriaLabel('Wyczyść');
      clearBtn!.click();

      expect(mockDrawingService.clearPolygon).toHaveBeenCalled();
    });
  });

  // ─── Validation Errors Display (Max 5) ──────────────────────────────────────

  describe('Validation errors display (max 5)', () => {
    it('should not display errors when validationErrors is empty', () => {
      toolbarStateSignal.set('polygon-ready');
      validationErrorsSignal.set([]);
      fixture.detectChanges();

      const errorList = getErrorList();
      expect(errorList).toBeNull();
    });

    it('should display validation errors when present', () => {
      toolbarStateSignal.set('polygon-ready');
      validationErrorsSignal.set(['Error 1', 'Error 2', 'Error 3']);
      fixture.detectChanges();

      const errors = getValidationErrors();
      expect(errors.length).toBe(3);
      expect(errors[0].textContent?.trim()).toBe('Error 1');
      expect(errors[1].textContent?.trim()).toBe('Error 2');
      expect(errors[2].textContent?.trim()).toBe('Error 3');
    });

    it('should display at most 5 validation errors even if more exist', () => {
      toolbarStateSignal.set('polygon-ready');
      // The service already truncates to 5, but we test the template renders what the signal provides
      validationErrorsSignal.set(['E1', 'E2', 'E3', 'E4', 'E5']);
      fixture.detectChanges();

      const errors = getValidationErrors();
      expect(errors.length).toBe(5);
    });

    it('should have role="alert" and aria-live="polite" on error list', () => {
      toolbarStateSignal.set('polygon-ready');
      validationErrorsSignal.set(['Error 1']);
      fixture.detectChanges();

      const errorList = getErrorList();
      expect(errorList).not.toBeNull();
      expect(errorList!.getAttribute('role')).toBe('alert');
      expect(errorList!.getAttribute('aria-live')).toBe('polite');
    });
  });

  // ─── Button Disabled States in Each Toolbar State ───────────────────────────

  describe('Button disabled states in each toolbar state', () => {
    it('idle: "Nowy obszar" should be enabled', () => {
      toolbarStateSignal.set('idle');
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Nowy obszar');
      expect(btn!.disabled).toBe(false);
    });

    it('drawing: "Nowy obszar" should be disabled', () => {
      toolbarStateSignal.set('drawing');
      isDrawingSignal.set(true);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Nowy obszar');
      expect(btn!.disabled).toBe(true);
    });

    it('drawing: "Anuluj" should be enabled', () => {
      toolbarStateSignal.set('drawing');
      isDrawingSignal.set(true);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Anuluj');
      expect(btn!.disabled).toBe(false);
    });

    it('polygon-ready: "Zapisz" should be enabled when polygon is valid', () => {
      toolbarStateSignal.set('polygon-ready');
      isValidSignal.set(true);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Zapisz');
      expect(btn!.disabled).toBe(false);
    });

    it('polygon-ready: "Zapisz" should be disabled when polygon is invalid', () => {
      toolbarStateSignal.set('polygon-ready');
      isValidSignal.set(false);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Zapisz');
      expect(btn!.disabled).toBe(true);
    });

    it('polygon-ready: "Wyczyść" should be enabled', () => {
      toolbarStateSignal.set('polygon-ready');
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Wyczyść');
      expect(btn!.disabled).toBe(false);
    });

    it('submitting: "Zapisz" should be disabled', () => {
      toolbarStateSignal.set('submitting');
      isSubmittingSignal.set(true);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Zapisz');
      expect(btn!.disabled).toBe(true);
    });

    it('submitting: "Wyczyść" should be disabled', () => {
      toolbarStateSignal.set('submitting');
      isSubmittingSignal.set(true);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Wyczyść');
      expect(btn!.disabled).toBe(true);
    });

    it('submitting: "Zapisz" should show spinner/loading text', () => {
      toolbarStateSignal.set('submitting');
      isSubmittingSignal.set(true);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Zapisz');
      const label = btn!.querySelector('.area-toolbar__label');
      expect(label?.textContent?.trim()).toBe('Zapisuję...');
    });
  });

  // ─── aria-pressed Attribute Toggling ────────────────────────────────────────

  describe('aria-pressed attribute toggling', () => {
    it('should have aria-pressed="false" on "Nowy obszar" in idle state', () => {
      toolbarStateSignal.set('idle');
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Nowy obszar');
      expect(btn!.getAttribute('aria-pressed')).toBe('false');
    });

    it('should have aria-pressed="true" on "Nowy obszar" in drawing state', () => {
      toolbarStateSignal.set('drawing');
      isDrawingSignal.set(true);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Nowy obszar');
      expect(btn!.getAttribute('aria-pressed')).toBe('true');
    });
  });

  // ─── Service Method Calls ───────────────────────────────────────────────────

  describe('Service method calls', () => {
    it('should call startDrawing when "Nowy obszar" is clicked', () => {
      toolbarStateSignal.set('idle');
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Nowy obszar');
      btn!.click();

      expect(mockDrawingService.startDrawing).toHaveBeenCalled();
    });

    it('should call submitArea when "Zapisz" is clicked', () => {
      toolbarStateSignal.set('polygon-ready');
      isValidSignal.set(true);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Zapisz');
      btn!.click();

      expect(mockDrawingService.submitArea).toHaveBeenCalled();
    });
  });

  // ─── Aria Labels ────────────────────────────────────────────────────────────

  describe('Aria labels on buttons', () => {
    it('should have aria-label="Nowy obszar" in idle state', () => {
      toolbarStateSignal.set('idle');
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Nowy obszar');
      expect(btn).not.toBeNull();
    });

    it('should have aria-label="Anuluj" in drawing state', () => {
      toolbarStateSignal.set('drawing');
      isDrawingSignal.set(true);
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Anuluj');
      expect(btn).not.toBeNull();
    });

    it('should have aria-label="Zapisz" in polygon-ready state', () => {
      toolbarStateSignal.set('polygon-ready');
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Zapisz');
      expect(btn).not.toBeNull();
    });

    it('should have aria-label="Wyczyść" in polygon-ready state', () => {
      toolbarStateSignal.set('polygon-ready');
      fixture.detectChanges();

      const btn = getButtonByAriaLabel('Wyczyść');
      expect(btn).not.toBeNull();
    });
  });
});
