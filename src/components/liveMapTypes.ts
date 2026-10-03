import { buildMapTheme, LIVE_MAP_LIGHT_STYLE } from '../theme/mapTheme';

export type LngLat = [longitude: number, latitude: number];

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type LiveVehicleKind = 'bike' | 'auto' | 'mini_truck' | 'prime_sedan';

export type LiveVehicle = {
  lngLat: LngLat;
  /** Degrees clockwise from true north. */
  bearing?: number;
  kind?: LiveVehicleKind;
};

export type LivePinVariant = 'dot' | 'end';

export type LivePin = {
  id: string;
  lngLat: LngLat;
  color?: string;
  variant?: LivePinVariant;
};

export type LiveRoute = {
  /** Ordered [lng, lat] pairs. */
  coordinates: LngLat[];
  /**
   * How many leading coordinates have already been driven. When set (and
   * between 0 and the full length) the route renders as a solid travelled
   * segment plus a dashed remaining segment.
   */
  traveledCount?: number;
};

export type LiveMapCamera = {
  lngLat?: LngLat;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  duration?: number;
};

export type LiveMapFitOptions = {
  padding?: number;
  duration?: number;
};

export const CHENNAI_REGION: MapRegion = {
  latitude: 13.0316,
  longitude: 80.2341,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export const LIVE_MAP_STYLE = LIVE_MAP_LIGHT_STYLE;

/** Lifted off the light values so every marker still reads on
 *  navigation-night-v1. `prime_sedan` is near-black and vanishes otherwise. */
export const VEHICLE_COLORS_DARK: Record<LiveVehicleKind, string> = {
  bike: '#38bdf8',
  auto: '#fbbf24',
  mini_truck: '#a78bfa',
  prime_sedan: '#e2e8f0',
};

export const VEHICLE_COLORS_LIGHT: Record<LiveVehicleKind, string> = {
  bike: '#0ea5e9',
  auto: '#f59e0b',
  mini_truck: '#7c3aed',
  prime_sedan: '#1e293b',
};

export const VEHICLE_COLORS = VEHICLE_COLORS_LIGHT;

export function vehicleColor(kind: LiveVehicleKind | undefined, isDark: boolean): string {
  const table = isDark ? VEHICLE_COLORS_DARK : VEHICLE_COLORS_LIGHT;
  return table[kind ?? 'bike'] ?? table.bike;
}

/** Basemap URL for a theme, resolved through the shared map tokens. */
export function mapStyleForTheme(isDark: boolean): string {
  return buildMapTheme(isDark).styleUrl;
}

export function zoomFromRegion(region: MapRegion): number {
  return Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2) || 12;
}
