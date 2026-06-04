import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { MapToolbarComponent } from './map-toolbar.component';

// Test host component to provide signal inputs
@Component({
  standalone: true,
  imports: [MapToolbarComponent],
  template: `
    <app-map-toolbar
      [isDrawing]="isDrawing()"
      [hasPolygon]="hasPolygon()"
      [isValid]="isValid()"
      [isSubmitting]="isSubmitting()"
      [validationErrors]="validationErrors()"
      (draw)="onDraw()"
      (clear)="onClear()"
      (submit)="onSubmit()"
    />
  `,
})
class TestHostComponent {
  isDrawing = signal(false);
  hasPolygon = signal(false);
  isValid = signal(false);
  isSubmitting = signal(false);
  validationErrors = signal<string[]>([]);

  drawCalled = false;
  clearCalled = false;
  submitCalled = false;

  onDraw(): void {
    this.drawCalled = true;
  }
  onClear(): void {
    this.clearCalled = true;
  }
  onSubmit(): void {
    this.submitCalled = true;
  }
}

describe('MapToolbarComponent', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, MapToolbarComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    host = hostFixture.componentInstance;
    hostFixture.detectChanges();
  });

  function getDrawButton(): HTMLButtonElement {
    return hostFixture.nativeElement.querySelector('.draw-btn') as HTMLButtonElement;
  }

  function getClearButton(): HTMLButtonElement {
    return hostFixture.nativeElement.querySelector('.clear-btn') as HTMLButtonElement;
  }

  function getSubmitButton(): HTMLButtonElement {
    return hostFixture.nativeElement.querySelector('.submit-btn') as HTMLButtonElement;
  }

  function getValidationErrors(): HTMLLIElement[] {
    return Array.from(hostFixture.nativeElement.querySelectorAll('.validation-errors li'));
  }

  describe('Draw button', () => {
    it('should be enabled when not drawing', () => {
      host.isDrawing.set(false);
      hostFixture.detectChanges();
      expect(getDrawButton().disabled).toBe(false);
    });

    it('should be disabled when drawing', () => {
      host.isDrawing.set(true);
      hostFixture.detectChanges();
      expect(getDrawButton().disabled).toBe(true);
    });

    it('should emit draw event on click', () => {
      getDrawButton().click();
      expect(host.drawCalled).toBe(true);
    });
  });

  describe('Clear button', () => {
    it('should be disabled when no polygon exists', () => {
      host.hasPolygon.set(false);
      hostFixture.detectChanges();
      expect(getClearButton().disabled).toBe(true);
    });

    it('should be enabled when polygon exists and not submitting', () => {
      host.hasPolygon.set(true);
      host.isSubmitting.set(false);
      hostFixture.detectChanges();
      expect(getClearButton().disabled).toBe(false);
    });

    it('should be disabled when submitting', () => {
      host.hasPolygon.set(true);
      host.isSubmitting.set(true);
      hostFixture.detectChanges();
      expect(getClearButton().disabled).toBe(true);
    });

    it('should emit clear event on click', () => {
      host.hasPolygon.set(true);
      hostFixture.detectChanges();
      getClearButton().click();
      expect(host.clearCalled).toBe(true);
    });
  });

  describe('Submit button', () => {
    it('should be disabled when polygon is not valid', () => {
      host.hasPolygon.set(true);
      host.isValid.set(false);
      hostFixture.detectChanges();
      expect(getSubmitButton().disabled).toBe(true);
    });

    it('should be disabled when no polygon exists even if valid', () => {
      host.hasPolygon.set(false);
      host.isValid.set(true);
      hostFixture.detectChanges();
      expect(getSubmitButton().disabled).toBe(true);
    });

    it('should be disabled when submitting', () => {
      host.hasPolygon.set(true);
      host.isValid.set(true);
      host.isSubmitting.set(true);
      hostFixture.detectChanges();
      expect(getSubmitButton().disabled).toBe(true);
    });

    it('should be enabled when polygon exists, is valid, and not submitting', () => {
      host.hasPolygon.set(true);
      host.isValid.set(true);
      host.isSubmitting.set(false);
      hostFixture.detectChanges();
      expect(getSubmitButton().disabled).toBe(false);
    });

    it('should emit submit event on click', () => {
      host.hasPolygon.set(true);
      host.isValid.set(true);
      hostFixture.detectChanges();
      getSubmitButton().click();
      expect(host.submitCalled).toBe(true);
    });

    it('should show "Submitting..." text when submitting', () => {
      host.hasPolygon.set(true);
      host.isValid.set(true);
      host.isSubmitting.set(true);
      hostFixture.detectChanges();
      expect(getSubmitButton().textContent?.trim()).toBe('Submitting...');
    });

    it('should show "Submit" text when not submitting', () => {
      host.hasPolygon.set(true);
      host.isValid.set(true);
      host.isSubmitting.set(false);
      hostFixture.detectChanges();
      expect(getSubmitButton().textContent?.trim()).toBe('Submit');
    });
  });

  describe('Validation errors', () => {
    it('should not display errors when validationErrors is empty', () => {
      host.validationErrors.set([]);
      hostFixture.detectChanges();
      const errorContainer = hostFixture.nativeElement.querySelector('.validation-errors');
      expect(errorContainer).toBeNull();
    });

    it('should display validation errors when present', () => {
      host.validationErrors.set([
        'Polygon must have at least 3 vertices.',
        'Polygon must be closed.',
      ]);
      hostFixture.detectChanges();
      const errors = getValidationErrors();
      expect(errors.length).toBe(2);
      expect(errors[0].textContent?.trim()).toBe('Polygon must have at least 3 vertices.');
      expect(errors[1].textContent?.trim()).toBe('Polygon must be closed.');
    });
  });
});
