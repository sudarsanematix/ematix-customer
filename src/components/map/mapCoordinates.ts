import { CHENNAI_REGION, type LngLat, type MapRegion } from '../liveMapTypes';

/**
 * Pure geometry helpers shared by the native map contract. No Mapbox imports
 * live here so the module stays trivially testable and safe on any platform.
 */

export type LatLng = { latitude: number; longitude: number };

export function isValidLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

/** Alias kept for parity with the retired WebView bridge's `isValidPair`. */
export function isValidPair(value: unknown): value is LngLat {
  return isValidLngLat(value);
}

export function toLngLat(point: LatLng): LngLat {
  return [point.longitude, point.latitude];
}

export function toLatLng(point: LngLat): LatLng {
  return { latitude: point[1], longitude: point[0] };
}

export function regionCenter(region: MapRegion = CHENNAI_REGION): LngLat {
  return [region.longitude, region.latitude];
}

/** Mirrors the WebView's `Math.round(log2(360 / longitudeDelta)) || 12`. */
export function zoomForDelta(longitudeDelta: number): number {
  return Math.round(Math.log(360 / longitudeDelta) / Math.LN2) || 12;
}

export function zoomFromRegion(region: MapRegion): number {
  return zoomForDelta(region.longitudeDelta);
}

export type LngLatBounds = { ne: LngLat; sw: LngLat };

export function boundsOf(points: LngLat[]): LngLatBounds | null {
  const valid = points.filter(isValidLngLat);
  if (valid.length === 0) return null;

  let minLng = valid[0][0];
  let minLat = valid[0][1];
  let maxLng = valid[0][0];
  let maxLat = valid[0][1];

  for (const [lng, lat] of valid) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return { sw: [minLng, minLat], ne: [maxLng, maxLat] };
}

export function normalizeBearing(bearing: number): number {
  return ((bearing % 360) + 360) % 360;
}

/**
 * Index of the route vertex closest to `point`. Used to derive how much of a
 * route has already been travelled when the caller does not supply a
 * `traveledCount` (the live ride / parcel tracking case).
 */
export function nearestVertexIndex(coordinates: LngLat[], point: LngLat): number {
  let best = -1;
  let bestDistance = Infinity;
  for (let index = 0; index < coordinates.length; index += 1) {
    const [lng, lat] = coordinates[index];
    const dLng = lng - point[0];
    const dLat = lat - point[1];
    const distance = dLng * dLng + dLat * dLat;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

/** Shortest signed delta in degrees (-180..180), so a vehicle turns the short way. */
export function shortestTurn(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export function bearingBetween(from: LngLat, to: LngLat): number {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return normalizeBearing((Math.atan2(y, x) * 180) / Math.PI);
}
