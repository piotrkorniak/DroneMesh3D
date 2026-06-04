import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-map-toolbar',
  standalone: true,
  templateUrl: './map-toolbar.component.html',
  styleUrl: './map-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapToolbarComponent {
  // Signal inputs (Angular 21)
  readonly isDrawing = input(false);
  readonly hasPolygon = input(false);
  readonly isValid = input(false);
  readonly isSubmitting = input(false);
  readonly validationErrors = input<string[]>([]);

  // Output events
  readonly draw = output<void>();
  readonly clear = output<void>();
  readonly submit = output<void>();
}
