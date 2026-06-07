import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AreaResponse } from '../../api/models/area-response';
import { AreasApiService } from '../../api/services/areas.service';
import { FlightPlansApiService } from '../../api/services/flight-plans.service';
import { SelectionStateService } from '../../services/selection-state.service';
import { AreaCalculationService } from '../../services/area-calculation.service';
import { LiveAnnouncerService } from '../../services/live-announcer.service';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { sortByCreatedAtDesc } from '../../utils/sort-by-date';

/**
 * AreaListComponent displays a list of saved areas sorted by creation date descending.
 * Supports keyboard navigation, ARIA listbox pattern, loading/error/empty states,
 * and virtual scrolling for large lists (>50 items).
 */
@Component({
  selector: 'app-area-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RelativeTimePipe, SkeletonComponent, EmptyStateComponent, ConfirmationDialogComponent],
  templateUrl: './area-list.component.html',
  styleUrl: './area-list.component.scss',
})
export class AreaListComponent implements OnInit {
  private readonly areasApi = inject(AreasApiService);
  private readonly flightPlansApi = inject(FlightPlansApiService);
  private readonly areaCalcService = inject(AreaCalculationService);
  private readonly liveAnnouncer = inject(LiveAnnouncerService);
  readonly selectionState = inject(SelectionStateService);

  /** Areas displayed in the list — derived from SelectionStateService (single source of truth) */
  readonly areas = computed(() => this.selectionState.areas());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly focusedIndex = signal(-1);

  readonly skeletonItems = [0, 1, 2];

  /** Item height in pixels for virtual scrolling */
  private readonly ITEM_HEIGHT = 56;
  /** Number of buffer items rendered above/below viewport */
  private readonly BUFFER_COUNT = 5;

  readonly scrollTop = signal(0);

  readonly useVirtualScroll = computed(() => this.areas().length > 50);

  readonly totalHeight = computed(() => this.areas().length * this.ITEM_HEIGHT);

  readonly visibleItems = computed(() => {
    const allAreas = this.areas();
    if (!this.useVirtualScroll()) return [];

    const top = this.scrollTop();
    const containerHeight = 400; // matches max-height in CSS
    const startIdx = Math.max(0, Math.floor(top / this.ITEM_HEIGHT) - this.BUFFER_COUNT);
    const endIdx = Math.min(
      allAreas.length,
      Math.ceil((top + containerHeight) / this.ITEM_HEIGHT) + this.BUFFER_COUNT
    );

    return allAreas.slice(startIdx, endIdx).map((area, i) => ({
      area,
      index: startIdx + i,
    }));
  });

  readonly offsetY = computed(() => {
    if (!this.useVirtualScroll()) return 0;
    const top = this.scrollTop();
    const startIdx = Math.max(0, Math.floor(top / this.ITEM_HEIGHT) - this.BUFFER_COUNT);
    return startIdx * this.ITEM_HEIGHT;
  });

  readonly activeDescendantId = computed(() => {
    const idx = this.focusedIndex();
    const areasList = this.areas();
    if (idx >= 0 && idx < areasList.length) {
      return 'area-item-' + areasList[idx].id;
    }
    return null;
  });

  /** Cache for hectares computation to avoid recalculating on every change detection */
  private readonly hectaresCache = new Map<string, number>();

  /** Deletion state */
  readonly deleteDialogOpen = signal(false);
  readonly deleteLoading = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly deleteTargetArea = signal<AreaResponse | null>(null);
  readonly deletePlanCount = signal(0);

  /** Computed dialog message including cascade warning */
  readonly deleteDialogMessage = computed(() => {
    const planCount = this.deletePlanCount();
    if (planCount > 0) {
      return `Czy na pewno chcesz usunąć ten obszar? Zostaną również usunięte ${planCount} powiązane plany lotu.`;
    }
    return 'Czy na pewno chcesz usunąć ten obszar?';
  });

  ngOnInit(): void {
    this.loadAreas();
  }

  loadAreas(): void {
    this.loading.set(true);
    this.error.set(null);

    this.areasApi.listAreas().subscribe({
      next: (response) => {
        const sorted = sortByCreatedAtDesc(response);
        this.selectionState.areas.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Nie udało się pobrać listy obszarów');
        this.loading.set(false);
      },
    });
  }

  selectArea(id: string, index: number): void {
    this.selectionState.selectArea(id);
    this.focusedIndex.set(index);
  }

  getHectares(area: AreaResponse): number {
    const cached = this.hectaresCache.get(area.id);
    if (cached !== undefined) {
      return cached;
    }
    const coordinates = area.geometry?.coordinates?.[0] as [number, number][] | undefined;
    const hectares = coordinates ? this.areaCalcService.calculateHectares(coordinates) : 0;
    this.hectaresCache.set(area.id, hectares);
    return hectares;
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.scrollTop.set(target.scrollTop);
  }

  /** Initiate delete flow: fetch plan count and open confirmation dialog */
  onDeleteClick(area: AreaResponse, event: Event): void {
    event.stopPropagation();
    this.deleteError.set(null);
    this.deleteTargetArea.set(area);
    this.deleteLoading.set(false);

    this.flightPlansApi.list({ areaId: area.id }).subscribe({
      next: (plans) => {
        this.deletePlanCount.set(plans.length);
        this.deleteDialogOpen.set(true);
      },
      error: () => {
        // If we can't fetch plan count, still show dialog without cascade warning
        this.deletePlanCount.set(0);
        this.deleteDialogOpen.set(true);
      },
    });
  }

  /** Handle confirmation from dialog */
  onDeleteConfirmed(): void {
    const area = this.deleteTargetArea();
    if (!area) return;

    this.deleteLoading.set(true);

    this.areasApi.deleteArea(area.id).subscribe({
      next: () => {
        // Remove area from list
        const currentAreas = this.selectionState.areas();
        this.selectionState.areas.set(currentAreas.filter(a => a.id !== area.id));

        // Clear selection if the deleted area was selected
        if (this.selectionState.selectedAreaId() === area.id) {
          this.selectionState.selectArea(null);
          this.selectionState.plans.set([]);
        }

        // Close dialog and reset state
        this.deleteDialogOpen.set(false);
        this.deleteLoading.set(false);
        this.deleteTargetArea.set(null);

        // Announce deletion via aria-live
        const remainingCount = this.selectionState.areas().length;
        this.liveAnnouncer.announce(
          `Obszar usunięty. Pozostało ${remainingCount} obszarów.`
        );
      },
      error: (err) => {
        // Close dialog, show inline error
        this.deleteDialogOpen.set(false);
        this.deleteLoading.set(false);
        this.deleteTargetArea.set(null);
        this.deleteError.set(err?.message || 'Nie udało się usunąć obszaru');
      },
    });
  }

  /** Handle cancel from dialog */
  onDeleteCancelled(): void {
    this.deleteDialogOpen.set(false);
    this.deleteTargetArea.set(null);
  }

  /** Clear the delete error (on next user action) */
  clearDeleteError(): void {
    this.deleteError.set(null);
  }

  onKeydown(event: KeyboardEvent): void {
    const areasList = this.areas();
    const n = areasList.length;
    if (n === 0) return;

    const currentIndex = this.focusedIndex();

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % n;
        this.focusedIndex.set(nextIndex);
        this.scrollToItem(nextIndex);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = currentIndex <= 0 ? n - 1 : (currentIndex - 1 + n) % n;
        this.focusedIndex.set(prevIndex);
        this.scrollToItem(prevIndex);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const idx = this.focusedIndex();
        if (idx >= 0 && idx < n) {
          this.selectArea(areasList[idx].id, idx);
        }
        break;
      }
    }
  }

  private scrollToItem(index: number): void {
    const areasList = this.areas();
    if (index >= 0 && index < areasList.length) {
      const elementId = 'area-item-' + areasList[index].id;
      // Use requestAnimationFrame to ensure the DOM is updated before scrolling
      requestAnimationFrame(() => {
        const el = document.getElementById(elementId);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  }
}
