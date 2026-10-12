/**
 * Shared native map contract (Phase 2).
 *
 * One engine (`NativeMapView`) plus its marker/route/control helpers. RealMap
 * and LiveMap adapt onto this surface in a later phase. Existing shared modules
 * (`liveMapTypes`, `theme/mapTheme`, `markerImages`) are re-exported here rather
 * than duplicated so consumers have a single import point.
 */

export { default as NativeMapView } from './NativeMapView';
export { default as NativeMapMarkers } from './NativeMapMarkers';
export { default as NativeMapRoutes } from './NativeMapRoutes';
export { buildRouteSegments, type RouteSegments } from './NativeMapRoutes';
export { default as NativeMapControls } from './NativeMapControls';

export * from './mapTypes';
export * from './mapCamera';
export * from './mapCoordinates';
export {
  useVehicleTracking,
  normalizeVehicleKind,
  type VehicleLocationUpdate,
  type UseVehicleTracking,
  type UseVehicleTrackingOptions,
} from './useVehicleTracking';

export {
  CHENNAI_REGION,
  LIVE_MAP_STYLE,
  VEHICLE_COLORS,
  VEHICLE_COLORS_DARK,
  VEHICLE_COLORS_LIGHT,
  mapStyleForTheme,
  vehicleColor,
} from '../liveMapTypes';
export {
  buildMapTheme,
  LIVE_MAP_DARK_STYLE,
  LIVE_MAP_LIGHT_STYLE,
  type MapThemeTokens,
} from '../../theme/mapTheme';
export {
  MARKER_IMAGES,
  MARKER_IMAGE_KEYS,
  markerImageFor,
  markerImageKeyFor,
} from '../markerImages';
