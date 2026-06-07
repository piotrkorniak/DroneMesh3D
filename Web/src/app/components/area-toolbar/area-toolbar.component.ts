import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapDrawingService } from '../../services/map-drawing.service';

@Component({
  selector: 'app-area-toolbar',
  standalone: true,
  templateUrl: './area-toolbar.component.html',
  styleUrl: './area-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaToolbarComponent {
  readonly drawingService = inject(MapDrawingService);

  onStartDrawing(): void {
    this.drawingService.startDrawing();
  }

  onCancelDrawing(): void {
    this.drawingService.cancelDrawing();
  }

  onClearPolygon(): void {
    this.drawingService.clearPolygon();
  }

  onSubmitArea(): void {
    this.drawingService.submitArea().subscribe();
  }
}
