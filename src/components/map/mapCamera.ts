import type { Camera, CameraStop } from '@rnmapbox/maps';
import type { LngLat } from '../liveMapTypes';
import { boundsOf, isValidLngLat } from './mapCoordinates';
import type { NativeMapCamera, NativeMapFitOptions } from './mapTypes';

/** Camera tuning carried over from the retired WebView bridge. */
export const FLY_DURATION = 800;
export const FIT_DURATION = 700;
export const FOLLOW_DURATION = 900;
export const FOLLOW_EASE_DURATION = 700;
export const FOCUS_ZOOM = 15;
export const DEFAULT_EDGE_PADDING = 72;

export function toCameraStop(camera: NativeMapCamera | null | undefined): CameraStop {
  const stop: CameraStop = {};
  if (!camera) return stop;
  if (camera.lngLat) {
    stop.centerCoordinate = camera.lngLat;
  }
  if (typeof camera.zoom === 'number') {
    stop.zoomLevel = camera.zoom;
  }
  if (typeof camera.bearing === 'number') {
    stop.heading = camera.bearing;
  }
  if (typeof camera.pitch === 'number') {
    stop.pitch = camera.pitch;
  }
  stop.animationDuration =
    typeof camera.duration === 'number' ? camera.duration : FLY_DURATION;
  stop.animationMode = 'flyTo';
  return stop;
}

export function centerOn(
  camera: Camera | null,
  lngLat: LngLat,
  options?: { zoom?: number; duration?: number; mode?: CameraStop['animationMode'] }
): void {
  if (!camera || !isValidLngLat(lngLat)) return;
  const stop: CameraStop = {
    centerCoordinate: lngLat,
    animationDuration: options?.duration ?? FOLLOW_DURATION,
    animationMode: options?.mode ?? 'easeTo',
  };
  if (typeof options?.zoom === 'number') {
    stop.zoomLevel = options.zoom;
  }
  camera.setCamera(stop);
}

export type FitPadding =
  | number
  | [number, number, number, number]
  | { top?: number; right?: number; bottom?: number; left?: number }
  | { paddingTop?: number; paddingRight?: number; paddingBottom?: number; paddingLeft?: number };

export function normalizeFitPadding(
  padding?: FitPadding,
  fallback = DEFAULT_EDGE_PADDING
): [number, number, number, number] | number {
  if (padding === undefined || padding === null) return fallback;
  if (typeof padding === 'number') return padding;
  if (Array.isArray(padding)) return padding;
  const p = padding as Record<string, number | undefined>;
  const top = p.top ?? p.paddingTop ?? fallback;
  const right = p.right ?? p.paddingRight ?? fallback;
  const bottom = p.bottom ?? p.paddingBottom ?? fallback;
  const left = p.left ?? p.paddingLeft ?? fallback;
  return [top, right, bottom, left];
}

export function fitPoints(
  camera: Camera | null,
  points: LngLat[],
  options?: NativeMapFitOptions
): void {
  if (!camera) return;
  const valid = points.filter(isValidLngLat);
  if (valid.length === 0) return;

  const padding = normalizeFitPadding(options?.padding, DEFAULT_EDGE_PADDING);
  const duration = options?.duration ?? FIT_DURATION;

  if (valid.length === 1) {
    centerOn(camera, valid[0], { zoom: FOCUS_ZOOM, duration });
    return;
  }

  const bounds = boundsOf(valid);
  if (!bounds) return;

  if (bounds.ne[0] === bounds.sw[0] && bounds.ne[1] === bounds.sw[1]) {
    centerOn(camera, valid[0], { zoom: FOCUS_ZOOM, duration });
    return;
  }

  camera.fitBounds(bounds.ne, bounds.sw, padding, duration);
}

/** Stable key for the two route endpoints, used to detect a new route. */
export function routeEndpointsKey(
  coordinates: LngLat[] | null | undefined
): string {
  if (!coordinates || coordinates.length < 2) return '';
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return `${first[0]},${first[1]}|${last[0]},${last[1]}`;
}
