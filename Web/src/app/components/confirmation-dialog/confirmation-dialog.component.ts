import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  input,
  output,
  ViewChild,
} from '@angular/core';

/**
 * ConfirmationDialogComponent — accessible modal dialog for confirming destructive actions.
 *
 * Features:
 * - Signal inputs for title, message, confirmLabel, cancelLabel, loading
 * - Output emitters for confirmed and cancelled
 * - Focus trap: Tab/Shift+Tab cycle within dialog
 * - Initial focus on "Anuluj" (cancel) button on open
 * - Closes on Escape key press (emits cancelled)
 * - Disables buttons when loading is true
 * - Returns focus to trigger element on close
 * - ARIA: role="alertdialog", aria-modal="true", aria-labelledby, aria-describedby
 */
@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
})
export class ConfirmationDialogComponent implements AfterViewInit, OnDestroy {
  /** Dialog heading */
  readonly title = input.required<string>();

  /** Descriptive text (supports plan count warning) */
  readonly message = input.required<string>();

  /** Confirm button label */
  readonly confirmLabel = input<string>('Usuń');

  /** Cancel button label */
  readonly cancelLabel = input<string>('Anuluj');

  /** Disables buttons during operation */
  readonly loading = input<boolean>(false);

  /** Emitted when user confirms the action */
  readonly confirmed = output<void>();

  /** Emitted when user cancels the action */
  readonly cancelled = output<void>();

  @ViewChild('dialogEl', { static: true }) dialogElRef!: ElementRef<HTMLElement>;
  @ViewChild('cancelBtn', { static: true }) cancelBtnRef!: ElementRef<HTMLButtonElement>;

  private previouslyFocusedElement: Element | null = null;

  ngAfterViewInit(): void {
    this.previouslyFocusedElement = document.activeElement;
    // Set initial focus on "Anuluj" (cancel) button
    this.cancelBtnRef.nativeElement.focus();
  }

  ngOnDestroy(): void {
    // Return focus to trigger element on close
    if (this.previouslyFocusedElement instanceof HTMLElement) {
      this.previouslyFocusedElement.focus();
    }
  }

  onConfirm(): void {
    if (this.loading()) return;
    this.confirmed.emit();
  }

  onCancel(): void {
    if (this.loading()) return;
    this.cancelled.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
      return;
    }

    // Focus trap: Tab/Shift+Tab cycling within dialog
    if (event.key === 'Tab') {
      const focusableElements = this.getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];
      const activeEl = document.activeElement;

      if (event.shiftKey) {
        if (activeEl === firstEl || !this.dialogElRef.nativeElement.contains(activeEl)) {
          event.preventDefault();
          lastEl.focus();
        }
      } else {
        if (activeEl === lastEl || !this.dialogElRef.nativeElement.contains(activeEl)) {
          event.preventDefault();
          firstEl.focus();
        }
      }
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(this.dialogElRef.nativeElement.querySelectorAll<HTMLElement>(selector));
  }
}
