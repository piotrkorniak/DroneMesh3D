import * as fc from 'fast-check';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

// Feature: ux-area-management-redesign, Property 9: Focus trap containment

/**
 * Property-Based Tests for focus trap containment within the ConfirmationDialogComponent.
 *
 * **Validates: Requirements 7.3**
 *
 * Property 9: Focus trap containment
 * - For any sequence of Tab key presses while the confirmation dialog is open,
 *   keyboard focus SHALL remain on elements within the dialog and SHALL cycle
 *   through them without escaping to the background.
 */

@Component({
  standalone: true,
  imports: [ConfirmationDialogComponent],
  template: `
    <button id="trigger">Trigger</button>
    <app-confirmation-dialog
      [title]="'Confirm deletion'"
      [message]="'Are you sure?'"
      [confirmLabel]="'Delete'"
      [cancelLabel]="'Cancel'"
      [loading]="false"
    />
  `,
})
class TestHostComponent {}

describe('Feature: ux-area-management-redesign, Property 9: Focus trap containment', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let dialogEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const dialogWrapper = fixture.nativeElement.querySelector('.confirmation-dialog') as HTMLElement;
    dialogEl = dialogWrapper;
  });

  function getFocusableElements(): HTMLElement[] {
    return Array.from(
      dialogEl.querySelectorAll<HTMLElement>('button:not([disabled])')
    );
  }

  function dispatchTab(shiftKey: boolean): void {
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    dialogEl.dispatchEvent(event);
  }

  it('focus remains within dialog elements for any sequence of 1–50 Tab key presses', () => {
    const focusableElements = getFocusableElements();
    // Confirm we have at least 2 focusable elements (cancel + confirm buttons)
    expect(focusableElements.length).toBeGreaterThanOrEqual(2);

    const result = fc.check(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
        (tabSequence) => {
          // Reset focus to the first focusable element (cancel button)
          focusableElements[0].focus();

          for (const isShiftTab of tabSequence) {
            dispatchTab(isShiftTab);

            // Simulate what the browser would do after preventDefault
            // The onKeydown handler calls focus() on the target element directly
            // so document.activeElement should be one of the dialog's focusable elements
            const activeEl = document.activeElement;

            // Focus must be within the dialog
            if (!dialogEl.contains(activeEl)) {
              return false;
            }

            // Focus must be on one of the focusable elements
            if (!focusableElements.includes(activeEl as HTMLElement)) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).withContext(
      result.failed ? `Counterexample: ${JSON.stringify(result.counterexample)}` : ''
    ).toBeFalse();
  });

  it('Tab at last focusable element wraps focus to first element', () => {
    const focusableElements = getFocusableElements();
    const lastEl = focusableElements[focusableElements.length - 1];
    const firstEl = focusableElements[0];

    const result = fc.check(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (repeatCount) => {
          // Each iteration: focus the last element, press Tab, confirm wraps to first
          for (let i = 0; i < repeatCount; i++) {
            lastEl.focus();
            dispatchTab(false);

            if (document.activeElement !== firstEl) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).withContext(
      result.failed ? `Counterexample: ${JSON.stringify(result.counterexample)}` : ''
    ).toBeFalse();
  });

  it('Shift+Tab at first focusable element wraps focus to last element', () => {
    const focusableElements = getFocusableElements();
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    const result = fc.check(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (repeatCount) => {
          // Each iteration: focus the first element, press Shift+Tab, confirm wraps to last
          for (let i = 0; i < repeatCount; i++) {
            firstEl.focus();
            dispatchTab(true);

            if (document.activeElement !== lastEl) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).withContext(
      result.failed ? `Counterexample: ${JSON.stringify(result.counterexample)}` : ''
    ).toBeFalse();
  });
});
