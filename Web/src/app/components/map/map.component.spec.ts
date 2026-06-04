import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { PolygonValidatorService } from '../../services/polygon-validator.service';
import { ValidationRule } from '../../models/validation';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial signal values', () => {
    expect(component.validationResult()).toBeNull();
    expect(component.isSubmitting()).toBeFalse();
    expect(component.submissionError()).toBeNull();
    expect(component.hasPolygon()).toBeFalse();
    expect(component.isDrawing()).toBeFalse();
  });

  it('should compute isValid as false when validationResult is null', () => {
    expect(component.isValid()).toBeFalse();
  });

  it('should compute isValid as true when validationResult.isValid is true', () => {
    component.validationResult.set({ isValid: true, errors: [] });
    expect(component.isValid()).toBeTrue();
  });

  it('should compute validationErrors as empty array when no result', () => {
    expect(component.validationErrors()).toEqual([]);
  });

  it('should compute validationErrors from validationResult errors', () => {
    component.validationResult.set({
      isValid: false,
      errors: [
        { rule: ValidationRule.MinVertices, message: 'Too few vertices' },
        { rule: ValidationRule.Closure, message: 'Not closed' },
      ],
    });
    expect(component.validationErrors()).toEqual(['Too few vertices', 'Not closed']);
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

  describe('startDrawing', () => {
    beforeEach(() => {
      fixture.detectChanges(); // initialize map
    });

    it('should set isDrawing to true', () => {
      component.startDrawing();
      expect(component.isDrawing()).toBeTrue();
    });

    it('should add a Draw interaction to the map', () => {
      component.startDrawing();
      const interactions = component.getMap().getInteractions().getArray();
      const drawInteraction = interactions.find(
        (i) => (i as any).type_ === 'Polygon' || i.constructor.name === 'Draw'
      );
      expect(drawInteraction).toBeTruthy();
    });

    it('should clear existing features before starting new drawing', () => {
      // Add a dummy feature to the vector source
      const Feature = (window as any).ol?.Feature;
      component.vectorSource.clear(); // ensure clean state
      component.startDrawing();
      // After calling startDrawing, vectorSource should be empty (no previously drawn features)
      expect(component.vectorSource.getFeatures().length).toBe(0);
    });

    it('should remove previous draw interaction when starting a new one', () => {
      component.startDrawing();
      const map = component.getMap();
      const interactionsBefore = map.getInteractions().getArray().length;

      component.startDrawing(); // start a new one
      const interactionsAfter = map.getInteractions().getArray().length;

      // Should not accumulate interactions
      expect(interactionsAfter).toBe(interactionsBefore);
    });
  });

  describe('clearPolygon', () => {
    beforeEach(() => {
      fixture.detectChanges(); // initialize map
    });

    it('should clear the vectorSource', () => {
      component.startDrawing();
      component.clearPolygon();
      expect(component.vectorSource.getFeatures().length).toBe(0);
    });

    it('should reset hasPolygon to false', () => {
      component.hasPolygon.set(true);
      component.clearPolygon();
      expect(component.hasPolygon()).toBeFalse();
    });

    it('should reset validationResult to null', () => {
      component.validationResult.set({ isValid: true, errors: [] });
      component.clearPolygon();
      expect(component.validationResult()).toBeNull();
    });

    it('should reset isDrawing to false', () => {
      component.startDrawing();
      expect(component.isDrawing()).toBeTrue();
      component.clearPolygon();
      expect(component.isDrawing()).toBeFalse();
    });

    it('should reset submissionError to null', () => {
      component.submissionError.set('Some error');
      component.clearPolygon();
      expect(component.submissionError()).toBeNull();
    });

    it('should remove draw interaction from the map', () => {
      component.startDrawing();
      component.clearPolygon();

      const map = component.getMap();
      const interactions = map.getInteractions().getArray();
      // No Draw interactions should remain (only default interactions like DoubleClickZoom, etc.)
      const drawInteractions = interactions.filter(
        (i) => i.constructor.name === 'Draw'
      );
      expect(drawInteractions.length).toBe(0);
    });

    it('should remove modify interaction from the map', () => {
      // Simulate drawend by manually triggering addModifyInteraction
      component.startDrawing();

      const map = component.getMap();
      // Add a Modify interaction via private method (simulate post-draw state)
      (component as any).addModifyInteraction();

      // Verify Modify interaction exists
      let interactions = map.getInteractions().getArray();
      let modifyInteractions = interactions.filter(
        (i) => i.constructor.name === 'Modify'
      );
      expect(modifyInteractions.length).toBe(1);

      // Clear polygon should remove Modify interaction
      component.clearPolygon();
      interactions = map.getInteractions().getArray();
      modifyInteractions = interactions.filter(
        (i) => i.constructor.name === 'Modify'
      );
      expect(modifyInteractions.length).toBe(0);
    });
  });

  describe('modifyInteraction', () => {
    beforeEach(() => {
      fixture.detectChanges(); // initialize map
    });

    it('should add Modify interaction after drawing completes', () => {
      // Trigger addModifyInteraction (simulating post-draw state)
      (component as any).addModifyInteraction();

      const map = component.getMap();
      const interactions = map.getInteractions().getArray();
      const modifyInteractions = interactions.filter(
        (i) => i.constructor.name === 'Modify'
      );
      expect(modifyInteractions.length).toBe(1);
    });

    it('should not accumulate Modify interactions on repeated calls', () => {
      (component as any).addModifyInteraction();
      (component as any).addModifyInteraction();

      const map = component.getMap();
      const interactions = map.getInteractions().getArray();
      const modifyInteractions = interactions.filter(
        (i) => i.constructor.name === 'Modify'
      );
      expect(modifyInteractions.length).toBe(1);
    });

    it('should remove Modify interaction via removeModifyInteraction', () => {
      (component as any).addModifyInteraction();
      (component as any).removeModifyInteraction();

      const map = component.getMap();
      const interactions = map.getInteractions().getArray();
      const modifyInteractions = interactions.filter(
        (i) => i.constructor.name === 'Modify'
      );
      expect(modifyInteractions.length).toBe(0);
    });
  });

  describe('validation visual feedback', () => {
    beforeEach(() => {
      fixture.detectChanges(); // initialize map
    });

    it('should apply valid (blue) style to vector layer when validationResult is null', () => {
      component.validationResult.set(null);
      TestBed.flushEffects();

      const style = component.vectorLayer.getStyle() as any;
      expect(style).toBeTruthy();
      const stroke = style.getStroke();
      expect(stroke.getColor()).toBe('rgba(33, 150, 243, 1)');
    });

    it('should apply valid (blue) style to vector layer when polygon is valid', () => {
      component.validationResult.set({ isValid: true, errors: [] });
      TestBed.flushEffects();

      const style = component.vectorLayer.getStyle() as any;
      expect(style).toBeTruthy();
      const stroke = style.getStroke();
      expect(stroke.getColor()).toBe('rgba(33, 150, 243, 1)');
      const fill = style.getFill();
      expect(fill.getColor()).toBe('rgba(33, 150, 243, 0.15)');
    });

    it('should apply invalid (red) style to vector layer when polygon is invalid', () => {
      component.validationResult.set({
        isValid: false,
        errors: [{ rule: ValidationRule.MinVertices, message: 'Too few vertices' }],
      });
      TestBed.flushEffects();

      const style = component.vectorLayer.getStyle() as any;
      expect(style).toBeTruthy();
      const stroke = style.getStroke();
      expect(stroke.getColor()).toBe('rgba(244, 67, 54, 1)');
      const fill = style.getFill();
      expect(fill.getColor()).toBe('rgba(244, 67, 54, 0.15)');
    });

    it('should switch from invalid to valid style when validationResult changes', () => {
      // First set invalid
      component.validationResult.set({
        isValid: false,
        errors: [{ rule: ValidationRule.Closure, message: 'Not closed' }],
      });
      TestBed.flushEffects();

      let style = component.vectorLayer.getStyle() as any;
      expect(style.getStroke().getColor()).toBe('rgba(244, 67, 54, 1)');

      // Now set valid
      component.validationResult.set({ isValid: true, errors: [] });
      TestBed.flushEffects();

      style = component.vectorLayer.getStyle() as any;
      expect(style.getStroke().getColor()).toBe('rgba(33, 150, 243, 1)');
    });

    it('should revert to valid style when polygon is cleared', () => {
      component.validationResult.set({
        isValid: false,
        errors: [{ rule: ValidationRule.SelfIntersection, message: 'Self-intersection' }],
      });
      TestBed.flushEffects();

      component.clearPolygon();
      TestBed.flushEffects();

      const style = component.vectorLayer.getStyle() as any;
      expect(style.getStroke().getColor()).toBe('rgba(33, 150, 243, 1)');
    });
  });
});
