# Implementation Plan: UX Area Management Redesign

## Overview

This plan implements the redesign of area management UX by: creating a `MapDrawingService` to mediate drawing state, building an `AreaToolbarComponent` integrated in the side panel, creating a reusable `ConfirmationDialogComponent`, adding DELETE endpoints for areas and flight plans, wiring delete functionality into list components, removing the old `MapToolbarComponent`, and ensuring full accessibility compliance.

## Tasks

- [x] 1. Create MapDrawingService and core interfaces
  - [x] 1.1 Create `MapDrawingService` in `Web/src/app/services/map-drawing.service.ts`
    - Implement signals: `isDrawing`, `hasPolygon`, `isSubmitting`, `validationResult`, `drawnCoordinates`
    - Implement computed signals: `isValid`, `validationErrors`, `toolbarState`
    - Implement methods: `startDrawing()`, `cancelDrawing()`, `clearPolygon()`, `setPolygonCoordinates(coords)`, `submitArea()`
    - `submitArea()` delegates to `AreaService.createArea()`, updates `SelectionStateService` on success
    - Inject `PolygonValidatorService` for validation on coordinate set
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7_

  - [x] 1.2 Write property test for validation error truncation (Property 1)
    - **Property 1: Validation error display truncation**
    - Generate arrays of 0–20 error strings via fast-check, verify `validationErrors` signal emits at most min(N, 5) items and `isValid` is false when N > 0
    - **Validates: Requirements 1.6**

- [x] 2. Create AreaToolbarComponent
  - [x] 2.1 Create `AreaToolbarComponent` in `Web/src/app/components/area-toolbar/`
    - Create `area-toolbar.component.ts` — standalone, OnPush, injects `MapDrawingService`
    - Create `area-toolbar.component.html` — render state machine states: idle (show "Nowy obszar"), drawing (show "Anuluj"), polygon-ready (show "Zapisz" + "Wyczyść"), submitting (spinner + disabled)
    - Create `area-toolbar.component.scss` — dark theme styling using CSS custom properties from `_tokens.scss`
    - Add `aria-label` on all buttons ("Nowy obszar", "Anuluj", "Zapisz", "Wyczyść")
    - Add `aria-pressed="true"` on "Nowy obszar" button when drawing is active
    - Display max 5 validation errors under action buttons with `role="alert"` and `aria-live="polite"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.1, 8.3_

  - [x] 2.2 Write unit tests for AreaToolbarComponent state machine
    - Test transitions: idle → drawing → polygon-ready → submitting → idle
    - Test cancel returns to idle, clears polygon
    - Test validation errors display (max 5)
    - Test button disabled states in each toolbar state
    - Test aria-pressed attribute toggling
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 8.1, 8.3_

- [x] 3. Create ConfirmationDialogComponent
  - [x] 3.1 Create `ConfirmationDialogComponent` in `Web/src/app/components/confirmation-dialog/`
    - Create `confirmation-dialog.component.ts` — standalone, OnPush, signal inputs (`title`, `message`, `confirmLabel`, `cancelLabel`, `loading`), output emitters (`confirmed`, `cancelled`)
    - Create `confirmation-dialog.component.html` — `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, modal overlay backdrop
    - Create `confirmation-dialog.component.scss` — dark theme modal styling with `--ds-color-error` for destructive button
    - Implement focus trap: Tab cycles within dialog, Shift+Tab reverse cycles
    - Set initial focus on "Anuluj" button on open
    - Close on Escape key press (emit `cancelled`)
    - Disable buttons when `loading` input is true
    - Return focus to trigger element on close
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.7_

  - [x] 3.2 Write property test for focus trap containment (Property 9)
    - **Property 9: Focus trap containment**
    - Generate random sequences of 1–50 Tab key presses via fast-check, verify focus remains within dialog elements
    - **Validates: Requirements 7.3**

  - [x] 3.3 Write property test for confirmation dialog resource name display (Property 8)
    - **Property 8: Confirmation dialog displays resource name**
    - Generate random non-empty strings via fast-check, pass as `title`/`message`, verify the string appears in rendered DOM
    - **Validates: Requirements 7.1**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement backend DELETE area endpoint
  - [x] 5.1 Create `DeleteAreaCommand` in `Api/Commands/DeleteAreaCommand.cs`
    - Define `record DeleteAreaCommand(Guid Id) : IRequest<bool>`
    - _Requirements: 4.1_

  - [x] 5.2 Create `DeleteAreaCommandHandler` in `Api/Handlers/DeleteAreaCommandHandler.cs`
    - Inject `AppDbContext`, find area by ID
    - If not found, return `false`
    - If found, remove and save (cascade deletes flight plans via EF Core config)
    - Return `true` on success
    - _Requirements: 4.1, 4.4_

  - [x] 5.3 Add DELETE endpoint to `Api/Endpoints/AreasEndpoint.cs`
    - Map `DELETE /{id:guid}` route
    - Return 204 on success, 404 if not found
    - Invalid GUID format handled by route constraint (returns 400)
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.4 Write property test for DELETE area endpoint cascade (Property 4)
    - **Property 4: DELETE area endpoint correctness with cascade**
    - Use FsCheck to generate areas with 0–10 associated flight plans in test DB, send DELETE, verify area and all plans removed, status 204
    - **Validates: Requirements 4.1, 4.4**

  - [x] 5.5 Write property test for invalid GUID format returns 400 (Property 5)
    - **Property 5: Invalid GUID format returns 400**
    - Use FsCheck to generate arbitrary non-GUID strings, send DELETE /api/areas/{value}, verify 400
    - **Validates: Requirements 4.2**

- [ ] 6. Implement backend DELETE flight plan endpoint
  - [x] 6.1 Create `DeleteFlightPlanCommand` in `Api/Commands/DeleteFlightPlanCommand.cs`
    - Define `record DeleteFlightPlanCommand(Guid Id) : IRequest<bool>`
    - _Requirements: 6.3_

  - [x] 6.2 Create `DeleteFlightPlanCommandHandler` in `Api/Handlers/DeleteFlightPlanCommandHandler.cs`
    - Inject `AppDbContext`, find flight plan by ID
    - If not found, return `false`
    - If found, remove and save
    - Return `true` on success
    - _Requirements: 6.3_

  - [x] 6.3 Add DELETE endpoint to `Api/Endpoints/FlightPlansEndpoint.cs`
    - Map `DELETE /{id:guid}` route
    - Return 204 on success, 404 if not found
    - _Requirements: 6.3_

- [ ] 7. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Add delete methods to frontend API services
  - [x] 8.1 Add `deleteArea(id: string): Observable<void>` to `AreasApiService` in `Web/src/app/api/services/areas.service.ts`
    - Send HTTP DELETE to `/api/areas/${id}`
    - _Requirements: 3.3, 4.1_

  - [x] 8.2 Add `deleteFlightPlan(id: string): Observable<void>` to `FlightPlansApiService` in `Web/src/app/api/services/flight-plans.service.ts`
    - Send HTTP DELETE to `${this.basePath}/${id}`
    - _Requirements: 6.3_

- [ ] 9. Integrate delete functionality into AreaListComponent
  - [x] 9.1 Modify `AreaListComponent` to support area deletion
    - Add delete button to each area item in template (always in DOM, visually hidden until hover/focus via CSS opacity/visibility)
    - Add `tabindex="0"` to delete button for keyboard accessibility
    - Inject `AreasApiService`, `FlightPlansApiService` (for plan count), `LiveAnnouncerService`
    - On delete click: fetch plan count for area, open `ConfirmationDialogComponent` with cascade warning if plans > 0
    - On confirm: call `deleteArea()`, remove from list, clear selection if deleted area was selected, announce via aria-live
    - On error: close dialog, show inline error message
    - Import `ConfirmationDialogComponent` in component
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.2, 8.4_

  - [x] 9.2 Write property test for deletion clears selection state (Property 2)
    - **Property 2: Deletion clears selection state**
    - Generate random area IDs via fast-check, set as selected, simulate delete success, verify `selectedAreaId` is null and plans list is empty
    - **Validates: Requirements 3.5**

  - [x] 9.3 Write property test for cascade plan count in dialog (Property 3)
    - **Property 3: Confirmation dialog shows cascade plan count**
    - Generate areas with 1–50 associated plans via fast-check, verify confirmation dialog message contains the plan count number
    - **Validates: Requirements 3.6**

- [ ] 10. Integrate delete functionality into FlightPlanListComponent
  - [x] 10.1 Modify `FlightPlanListComponent` to support flight plan deletion
    - Add delete button to each plan item in template (always in DOM, visually hidden until hover/focus)
    - Add `tabindex="0"` to delete button for keyboard accessibility
    - Inject `FlightPlansApiService` (for delete), `LiveAnnouncerService`
    - On delete click: open `ConfirmationDialogComponent` identifying plan by mode + date
    - On confirm: call `deleteFlightPlan()`, remove from list, clear flight path visualization if plan was visualized, announce via aria-live
    - On error: show inline error, preserve plan in list, re-enable delete button
    - Import `ConfirmationDialogComponent` in component
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.5, 8.6_

  - [x] 10.2 Write property test for aria-live announces plan count on change (Property 10)
    - **Property 10: Aria-live announces plan count on change**
    - Generate plan list mutations (add/remove) via fast-check, verify aria-live announcement contains new total count
    - **Validates: Requirements 8.5**

  - [x] 10.3 Write property test for flight plans sorted descending (Property 6)
    - **Property 6: Flight plans sorted descending by createdAt**
    - Generate lists of plans with random dates via fast-check, verify after sort every consecutive pair satisfies plan[i].createdAt >= plan[i+1].createdAt
    - **Validates: Requirements 5.6**

  - [x] 10.4 Write property test for flight plan item displays all fields (Property 7)
    - **Property 7: Flight plan item displays all required fields**
    - Generate random valid `FlightPlanResponse` objects via fast-check, render component, verify DOM contains: mode label, createdAt, distance (integer meters), flight time ("X min Y s"), photo count
    - **Validates: Requirements 5.7**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Refactor MapComponent to use MapDrawingService
  - [x] 12.1 Modify `MapComponent` to remove toolbar and integrate `MapDrawingService`
    - Remove `MapToolbarComponent` import and template usage
    - Remove `toolbar-overlay` div from template
    - Keep `MapSearchComponent` as sole overlay
    - Inject `MapDrawingService`
    - Add `effect()` that watches `MapDrawingService.isDrawing` — when true, add Draw interaction; when false, remove it
    - On draw end: call `MapDrawingService.setPolygonCoordinates(coords4326)`
    - Watch `MapDrawingService.hasPolygon` for Modify interaction management
    - Keep validation visual styles (valid/invalid polygon rendering)
    - Keep `selectedAreaEffect` for rendering selected areas
    - Remove internal `isDrawing`, `hasPolygon`, `isSubmitting`, `validationResult` signals (now in MapDrawingService)
    - Remove `startDrawing()`, `clearPolygon()`, `submitArea()` methods (now delegated to MapDrawingService)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 12.2 Write unit tests for MapComponent integration with MapDrawingService
    - Test that Draw interaction is added when `MapDrawingService.isDrawing` becomes true
    - Test that Draw interaction is removed when `MapDrawingService.isDrawing` becomes false
    - Test that `MapToolbarComponent` is no longer rendered
    - Test that `MapSearchComponent` is still rendered
    - _Requirements: 2.1, 2.3, 2.4_

- [ ] 13. Integrate AreaToolbarComponent into SidePanelComponent
  - [x] 13.1 Add `AreaToolbarComponent` to side panel Area_Section
    - Import `AreaToolbarComponent` in `SidePanelComponent`
    - Add `<app-area-toolbar />` inside the Area_List section content, above `<app-area-list />`
    - _Requirements: 1.1_

- [ ] 14. Delete MapToolbarComponent files
  - [x] 14.1 Remove `MapToolbarComponent` files
    - Delete `Web/src/app/components/map-toolbar/map-toolbar.component.ts`
    - Delete `Web/src/app/components/map-toolbar/map-toolbar.component.html`
    - Delete `Web/src/app/components/map-toolbar/map-toolbar.component.scss`
    - Remove any remaining imports of `MapToolbarComponent` across the project
    - _Requirements: 2.1_

- [ ] 15. Final checkpoint - Ensure all tests pass and integration works
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check (frontend) and FsCheck (backend)
- Unit tests validate specific examples and edge cases
- The project uses Angular 21 zoneless with signals-based architecture — all new components must be standalone with OnPush change detection
- Backend uses .NET 10 with MediatR CQRS pattern — all new endpoints follow the existing Minimal API pattern
- EF Core cascade delete is already configured on `FlightPlanEntity.AreaId` FK — no additional migration needed for area deletion

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "5.1", "6.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.2", "3.3", "5.2", "6.2"] },
    { "id": 2, "tasks": ["2.2", "5.3", "6.3", "8.1", "8.2"] },
    { "id": 3, "tasks": ["5.4", "5.5", "9.1", "10.1"] },
    { "id": 4, "tasks": ["9.2", "9.3", "10.2", "10.3", "10.4", "12.1"] },
    { "id": 5, "tasks": ["12.2", "13.1"] },
    { "id": 6, "tasks": ["14.1"] }
  ]
}
```
