import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { MapThemeTokens } from '../../theme/mapTheme';
import type {
  LiveMapCamera,
  LiveMapFitOptions,
  LivePin,
  LivePinVariant,
  LiveRoute,
  LiveVehicle,
  LngLat,
  MapRegion,
} from '../liveMapTypes';

/**
 * Phase 2 — the shared native map contract.
 *
 * One engine (`NativeMapView`) renders every map the app needs. RealMap and
 * LiveMap become thin adapters that translate their existing props into this
 * surface (see `markerFromLegacy`, `markersFromPins`, `markerFromVehicle`).
 */

export type {
  LiveMapCamera,
  LiveMapFitOptions,
  LivePin,
  LivePinVariant,
  LiveRoute,
  LiveVehicle,
  LngLat,
  MapRegion,
};

export type MapPadding =
  | { top?: number; bottom?: number; left?: number; right?: number }
  | { paddingTop?: number; paddingBottom?: number; paddingLeft?: number; paddingRight?: number }
  | [number, number, number, number]
  | number;

/**
 * The four marker personalities the WebView bridge used to switch on. A single
 * discriminated list replaces both `RealMap.markers` and `LiveMap.pins`.
 */
export type NativeMapMarkerKind = 'beacon' | 'vehicle' | 'title' | 'pin' | 'pulse';

export type NativeMapMarker = {
  id: string;
  lngLat: LngLat;
  /** Defaults to `pin`. */
  kind?: NativeMapMarkerKind;
  color?: string;
  /** Beacon copy. Defaults to `You are here`. */
  label?: string;
  /** Title marker copy. Required for `kind: 'title'`. */
  title?: string;
  /** Sprite/colour key for `kind: 'vehicle'` (car | auto | bike | premium_car …). */
  vehicleType?: string;
  /**
   * Vehicle look. `image` = PNG sprite (RealMap / booking screens); `badge` =
   * coloured disc + kind icon (LiveMap ride/parcel tracking). Defaults to `image`.
   */
  vehicleStyle?: 'image' | 'badge';
  /** Degrees clockwise from north. Only meaningful for `kind: 'vehicle'`. */
  bearing?: number;
  /** Pin shape. Only meaningful for `kind: 'pin'` (defaults to `dot`). */
  variant?: LivePinVariant;
  onPress?: () => void;
};

export type NativeMapCamera = LiveMapCamera;
export type NativeMapFitOptions = LiveMapFitOptions;

export type NativeMapHandle = {
  flyTo: (target?: NativeMapCamera | null) => void;
  fitAll: (options?: NativeMapFitOptions | null) => void;
  focusVehicle: () => void;
  setFollow: (value: boolean) => void;
};

export type NativeMapRegionChange = { latitude: number; longitude: number };

export type NativeMapProps = {
  style?: StyleProp<ViewStyle>;
  /** Fallback camera when `center`/`zoom` are not supplied. */
  region?: MapRegion;
  center?: LngLat;
  zoom?: number;
  interactive?: boolean;
  mapStyle?: string;
  /** Forces a palette (tests / previews). Defaults to the app theme. */
  theme?: MapThemeTokens;
  /** Pre-built markers. RealMap passes these directly. */
  markers?: NativeMapMarker[];
  route?: LiveRoute | null;
  /** Live vehicle position used to split the route into done / remaining. */
  progressAt?: LngLat | null;
  /** LiveMap-style vehicle; folded into the marker list as `kind: 'vehicle'`. */
  vehicle?: LiveVehicle | null;
  /** LiveMap-style pins; folded into the marker list as `kind: 'pin'`. */
  pins?: LivePin[];
  follow?: boolean;
  /** Fit the camera when a new route endpoint pair arrives. Defaults to true. */
  fitOnRouteChange?: boolean;
  /** Padding used by `fitAll` and as the camera padding fallback. */
  edgePadding?: number;
  /** RealMap parity. Shows the native user-location puck. */
  showUserLocation?: boolean;
  /** RealMap parity. Shifts the camera target. */
  mapPadding?: MapPadding;
  onPress?: (lngLat: LngLat) => void;
  onUserMove?: () => void;
  onRegionChange?: (region: NativeMapRegionChange) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  children?: ReactNode;
};

/** Shape of `RealMap`'s `MapMarker`, kept structural to avoid a circular import. */
export type LegacyMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  vehicleType?: string;
  title?: string;
};

export function markerFromLegacy(marker: LegacyMapMarker): NativeMapMarker {
  const lngLat: LngLat = [marker.longitude, marker.latitude];
  if (marker.id === 'me') {
    return { id: marker.id, lngLat, kind: 'beacon', color: marker.color };
  }
  if (marker.title) {
    return { id: marker.id, lngLat, kind: 'title', title: marker.title, color: marker.color };
  }
  if (marker.vehicleType) {
    return {
      id: marker.id,
      lngLat,
      kind: 'vehicle',
      vehicleType: marker.vehicleType,
      vehicleStyle: 'image',
    };
  }
  return { id: marker.id, lngLat, kind: 'pin', color: marker.color };
}

export function markersFromLegacy(markers: LegacyMapMarker[]): NativeMapMarker[] {
  return markers.map(markerFromLegacy);
}

export function markersFromPins(pins: LivePin[]): NativeMapMarker[] {
  return pins.map((pin) => ({
    id: pin.id,
    lngLat: pin.lngLat,
    kind: 'pin' as const,
    color: pin.color,
    variant: pin.variant,
  }));
}

export function markerFromVehicle(vehicle: LiveVehicle): NativeMapMarker {
  return {
    id: 'vehicle',
    lngLat: vehicle.lngLat,
    kind: 'vehicle',
    vehicleType: vehicle.kind,
    vehicleStyle: 'badge',
    bearing: vehicle.bearing,
  };
}
