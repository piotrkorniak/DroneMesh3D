import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import { fromLonLat, toLonLat } from 'ol/proj';
import { boundingExtent } from 'ol/extent';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';

import { SelectionStateService } from '../../services/selection-state.service';
import { FlightPathVisualizationService } from '../../services/flight-path-visualization.service';
import { MapDrawingService } from '../../services/map-drawing.service';
import { MapSearchComponent, LocationSelectedEvent } from '../map-search/map-search.component';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
  standalone: true,
  imports: [MapSearchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements OnInit, OnDestroy {
  private readonly selectionState = inject(SelectionStateService);
  private readonly flightPathViz = inject(FlightPathVisualizationService);
  private readonly mapDrawingService = inject(MapDrawingService);

  private map!: Map;
  readonly vectorSource = new VectorSource();
  readonly vectorLayer = new VectorLayer({ source: this.vectorSource });
  private drawInteraction: Draw | null = null;
  private modifyInteraction: Modify | null = null;

  // Validation visual feedback styles
  private readonly validStyle = new Style({
    stroke: new Stroke({ color: 'rgba(33, 150, 243, 1)', width: 3 }),
    fill: new Fill({ color: 'rgba(33, 150, 243, 0.15)' }),
  });

  private readonly invalidStyle = new Style({
    stroke: new Stroke({ color: 'rgba(244, 67, 54, 1)', width: 3 }),
    fill: new Fill({ color: 'rgba(244, 67, 54, 0.15)' }),
  });

  // Reactive style update based on validation result from MapDrawingService
  private readonly validationStyleEffect = effect(() => {
    const result = this.mapDrawingService.validationResult();
    if (result === null) {
      this.vectorLayer.setStyle(this.validStyle);
    } else if (result.isValid) {
      this.vectorLayer.setStyle(this.validStyle);
    } else {
      this.vectorLayer.setStyle(this.invalidStyle);
    }
  });

  // Watch MapDrawingService.isDrawing — when true, add Draw interaction; when false, remove it
  private readonly drawingEffect = effect(() => {
    const isDrawing = this.mapDrawingService.isDrawing();
    if (isDrawing) {
      this.addDrawInteraction();
    } else {
      this.removeDrawInteraction();
    }
  });

  // Watch MapDrawingService.hasPolygon for Modify interaction management
  private readonly modifyEffect = effect(() => {
    const hasPolygon = this.mapDrawingService.hasPolygon();
    if (hasPolygon && !this.mapDrawingService.isDrawing()) {
      this.addModifyInteraction();
    } else if (!hasPolygon) {
      this.removeModifyInteraction();
      // Clear vector source when polygon is cleared externally (e.g., via toolbar clear/cancel)
      if (this.vectorSource.getFeatures().length > 0 && !this.selectionState.selectedArea()) {
        this.vectorSource.clear();
      }
    }
  });

  // React to selectedArea changes: draw polygon on map and animate to fit bounds
  private readonly selectedAreaEffect = effect(() => {
    const area = this.selectionState.selectedArea();

    // Clear any existing polygon from the vector source
    this.vectorSource.clear();
    this.removeModifyInteraction();

    if (!area || !area.geometry || !area.geometry.coordinates) return;

    const coordinates = area.geometry.coordinates[0]; // outer ring
    if (!coordinates || coordinates.length === 0) return;

    // Transform coordinates from EPSG:4326 to map projection (EPSG:3857)
    const projectedCoords = coordinates.map(coord => fromLonLat(coord as [number, number]));

    // Create and add the polygon feature to the map
    const polygon = new Polygon([projectedCoords]);
    const feature = new Feature(polygon);
    this.vectorSource.addFeature(feature);
    this.vectorLayer.setStyle(this.validStyle);

    // Animate map view to fit the extent with 10% padding, 500ms duration
    const extent = boundingExtent(projectedCoords);
    const view = this.map?.getView();
    if (view) {
      const size = this.map.getSize();
      const paddingValue = size ? Math.min(size[0], size[1]) * 0.1 : 50;
      view.fit(extent, {
        padding: [paddingValue, paddingValue, paddingValue, paddingValue],
        duration: 500,
      });
    }
  });

  ngOnInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.map?.setTarget(undefined);
  }

  private initializeMap(): void {
    this.map = new Map({
      target: 'map-container',
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        this.vectorLayer,
        this.flightPathViz.flightPathLayer,
      ],
      view: new View({
        projection: 'EPSG:3857',
        center: fromLonLat([20.0, 52.0]), // Center on Poland
        zoom: 7,
      }),
    });

    // Provide the map view reference to FlightPathVisualizationService
    this.flightPathViz.setMapView(this.map.getView());
  }

  private addDrawInteraction(): void {
    // Clear any existing features and interactions
    this.vectorSource.clear();
    this.removeDrawInteraction();

    // Create a new Draw interaction with type 'Polygon'
    this.drawInteraction = new Draw({
      source: this.vectorSource,
      type: 'Polygon',
    });

    // Listen for drawend event
    this.drawInteraction.on('drawend', event => {
      const geometry = event.feature.getGeometry();
      if (!geometry) return;

      // Extract coordinates from the drawn polygon (in EPSG:3857)
      const coords3857 = (geometry as Polygon).getCoordinates()[0];

      // Transform from EPSG:3857 to EPSG:4326 (WGS 84)
      const coords4326 = coords3857.map(coord => toLonLat(coord));

      // Delegate to MapDrawingService
      this.mapDrawingService.setPolygonCoordinates(coords4326);

      // Remove the draw interaction after drawing is complete
      this.removeDrawInteraction();
    });

    if (this.map) {
      this.map.addInteraction(this.drawInteraction);
    }
  }

  private removeDrawInteraction(): void {
    if (this.drawInteraction) {
      this.map?.removeInteraction(this.drawInteraction);
      this.drawInteraction = null;
    }
  }

  private addModifyInteraction(): void {
    this.removeModifyInteraction();

    this.modifyInteraction = new Modify({
      source: this.vectorSource,
    });

    this.modifyInteraction.on('modifyend', event => {
      const features = event.features.getArray();
      if (features.length === 0) return;

      const geometry = features[0].getGeometry();
      if (!geometry || !(geometry instanceof Polygon)) return;

      // Extract updated coordinates (in EPSG:3857)
      const coords3857 = geometry.getCoordinates()[0];

      // Transform from EPSG:3857 to EPSG:4326 (WGS 84)
      const coords4326 = coords3857.map(coord => toLonLat(coord));

      // Update coordinates in service (triggers re-validation)
      this.mapDrawingService.setPolygonCoordinates(coords4326);
    });

    if (this.map) {
      this.map.addInteraction(this.modifyInteraction);
    }
  }

  private removeModifyInteraction(): void {
    if (this.modifyInteraction) {
      this.map?.removeInteraction(this.modifyInteraction);
      this.modifyInteraction = null;
    }
  }

  getMap(): Map {
    return this.map;
  }

  flyToLocation(event: LocationSelectedEvent): void {
    const view = this.map?.getView();
    if (!view) return;

    view.animate({
      center: fromLonLat([event.lon, event.lat]),
      zoom: 16,
      duration: 500,
    });
  }
}
