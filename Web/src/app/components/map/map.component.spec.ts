import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MapComponent } from './map.component';
import { MapDrawingService } from '../../services/map-drawing.service';
import { ValidationRule } from '../../models/validation';
import { Style } from 'ol/style';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let mapDrawingService: MapDrawingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    mapDrawingService = TestBed.inject(MapDrawingService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the map on ngOnInit', () => {
    fixture.detectChanges(); // triggers ngOnInit
    const map = component.getMap();
    expect(map).toBeTruthy();
  });

  it('should have a VectorSource and VectorLayer', () => {
    expect(component.vectorSource).toBeTruthy();
    expect(component.vectorLayer).toBeTruthy();
    expect(component.vectorLayer.getSource()).toBe(component.vectorSource);
  });

  describe('drawingEffect (MapDrawingService.isDrawing)', () => {
    beforeEach(() => {
      fixture.detectChanges(); // initialize map
    });

    it('should add a Draw interaction when MapDrawingService.isDrawing becomes true', () => {
      mapDrawingService.startDrawing();
      TestBed.flushEffects();

      const interactions = component.getMap().getInteractions().getArray();
      const drawInteraction = interactions.find(
        (i) => i.constructor.name === 'Draw'
      );
      expect(drawInteraction).toBeTruthy();
    });

    it('should remove Draw interaction when MapDrawingService.isDrawing becomes false', () => {
      mapDrawingService.startDrawing();
      TestBed.flushEffects();

      mapDrawingService.cancelDrawing();
      TestBed.flushEffects();

      const map = component.getMap();
      const interactions = map.getInteractions().getArray();
      const drawInteractions = interactions.filter(
        (i) => i.constructor.name === 'Draw'
      );
      expect(drawInteractions.length).toBe(0);
    });

    it('should clear existing features before starting new drawing', () => {
      mapDrawingService.startDrawing();
      TestBed.flushEffects();

      // After starting drawing, vectorSource should be empty
      expect(component.vectorSource.getFeatures().length).toBe(0);
    });

    it('should not accumulate Draw interactions on repeated starts', () => {
      mapDrawingService.startDrawing();
      TestBed.flushEffects();

      const map = component.getMap();
      const interactionsBefore = map.getInteractions().getArray().filter(
        (i) => i.constructor.name === 'Draw'
      ).length;

      // Cancel and restart
      mapDrawingService.cancelDrawing();
      TestBed.flushEffects();
      mapDrawingService.startDrawing();
      TestBed.flushEffects();

      const interactionsAfter = map.getInteractions().getArray().filter(
        (i) => i.constructor.name === 'Draw'
      ).length;

      expect(interactionsAfter).toBe(interactionsBefore);
    });
  });

  describe('modifyEffect (MapDrawingService.hasPolygon)', () => {
    beforeEach(() => {
      fixture.detectChanges(); // initialize map
    });

    it('should add Modify interaction when hasPolygon is true and not drawing', () => {
      // Simulate drawing completion with a small valid polygon
      mapDrawingService.setPolygonCoordinates([
        [21.0122, 52.2297], [21.0132, 52.2297], [21.0132, 52.2287], [21.0122, 52.2287], [21.0122, 52.2297],
      ]);
      TestBed.flushEffects();

      const map = component.getMap();
      const interactions = map.getInteractions().getArray();
      const modifyInteractions = interactions.filter(
        (i) => i.constructor.name === 'Modify'
      );
      expect(modifyInteractions.length).toBe(1);
    });

    it('should remove Modify interaction when hasPolygon becomes false', () => {
      mapDrawingService.setPolygonCoordinates([
        [21.0122, 52.2297], [21.0132, 52.2297], [21.0132, 52.2287], [21.0122, 52.2287], [21.0122, 52.2297],
      ]);
      TestBed.flushEffects();

      mapDrawingService.clearPolygon();
      TestBed.flushEffects();

      const map = component.getMap();
      const interactions = map.getInteractions().getArray();
      const modifyInteractions = interactions.filter(
        (i) => i.constructor.name === 'Modify'
      );
      expect(modifyInteractions.length).toBe(0);
    });

    it('should not accumulate Modify interactions', () => {
      mapDrawingService.setPolygonCoordinates([
        [21.0122, 52.2297], [21.0132, 52.2297], [21.0132, 52.2287], [21.0122, 52.2287], [21.0122, 52.2297],
      ]);
      TestBed.flushEffects();

      // Simulate modify end by calling setPolygonCoordinates again
      mapDrawingService.setPolygonCoordinates([
        [21.0122, 52.2297], [21.0135, 52.2297], [21.0135, 52.2287], [21.0122, 52.2287], [21.0122, 52.2297],
      ]);
      TestBed.flushEffects();

      const map = component.getMap();
      const interactions = map.getInteractions().getArray();
      const modifyInteractions = interactions.filter(
        (i) => i.constructor.name === 'Modify'
      );
      expect(modifyInteractions.length).toBe(1);
    });
  });

  describe('validation visual feedback', () => {
    beforeEach(() => {
      fixture.detectChanges(); // initialize map
    });

    it('should apply valid (blue) style to vector layer when validationResult is null', () => {
      // validationResult starts as null in the service
      TestBed.flushEffects();

      const style = component.vectorLayer.getStyle() as Style;
      expect(style).toBeTruthy();
      const stroke = style.getStroke();
      expect(stroke!.getColor()).toBe('rgba(33, 150, 243, 1)');
    });

    it('should apply valid (blue) style to vector layer when polygon is valid', () => {
      mapDrawingService.validationResult.set({ isValid: true, errors: [] });
      TestBed.flushEffects();

      const style = component.vectorLayer.getStyle() as Style;
      expect(style).toBeTruthy();
      const stroke = style.getStroke();
      expect(stroke!.getColor()).toBe('rgba(33, 150, 243, 1)');
      const fill = style.getFill();
      expect(fill!.getColor()).toBe('rgba(33, 150, 243, 0.15)');
    });

    it('should apply invalid (red) style when MapDrawingService.validationResult is invalid', () => {
      // Directly set an invalid validation result on the service for testing style reactivity
      mapDrawingService.validationResult.set({
        isValid: false,
        errors: [{ rule: ValidationRule.MinVertices, message: 'Too few vertices' }],
      });
      TestBed.flushEffects();

      const style = component.vectorLayer.getStyle() as Style;
      expect(style).toBeTruthy();
      const stroke = style.getStroke();
      expect(stroke!.getColor()).toBe('rgba(244, 67, 54, 1)');
      const fill = style.getFill();
      expect(fill!.getColor()).toBe('rgba(244, 67, 54, 0.15)');
    });

    it('should switch from invalid to valid style when validationResult changes', () => {
      // Set invalid
      mapDrawingService.validationResult.set({
        isValid: false,
        errors: [{ rule: ValidationRule.Closure, message: 'Not closed' }],
      });
      TestBed.flushEffects();

      let style = component.vectorLayer.getStyle() as Style;
      expect(style.getStroke()!.getColor()).toBe('rgba(244, 67, 54, 1)');

      // Set valid
      mapDrawingService.validationResult.set({ isValid: true, errors: [] });
      TestBed.flushEffects();

      style = component.vectorLayer.getStyle() as Style;
      expect(style.getStroke()!.getColor()).toBe('rgba(33, 150, 243, 1)');
    });

    it('should revert to valid style when polygon is cleared via service', () => {
      mapDrawingService.validationResult.set({
        isValid: false,
        errors: [{ rule: ValidationRule.SelfIntersection, message: 'Self-intersection' }],
      });
      TestBed.flushEffects();

      mapDrawingService.clearPolygon();
      TestBed.flushEffects();

      const style = component.vectorLayer.getStyle() as Style;
      expect(style.getStroke()!.getColor()).toBe('rgba(33, 150, 243, 1)');
    });
  });

  describe('template rendering (Requirements 2.1, 2.3, 2.4)', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should not render MapToolbarComponent (app-map-toolbar) in template', () => {
      const toolbarEl = fixture.debugElement.query(By.css('app-map-toolbar'));
      expect(toolbarEl).toBeNull();
    });

    it('should not contain a toolbar-overlay element', () => {
      const overlayEl = fixture.debugElement.query(By.css('.toolbar-overlay'));
      expect(overlayEl).toBeNull();
    });

    it('should render MapSearchComponent (app-map-search) as the sole overlay', () => {
      const searchEl = fixture.debugElement.query(By.css('app-map-search'));
      expect(searchEl).toBeTruthy();
    });
  });
});
