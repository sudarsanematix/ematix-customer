import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LiveVehicle, LiveVehicleKind, LngLat } from '../liveMapTypes';
import { markerImageKeyFor } from '../markerImages';
import { isValidLngLat, normalizeBearing } from './mapCoordinates';

/**
 * A raw driver/partner location ping. Screens feed these in from their existing
 * Socket.IO handler; the hook owns no subscription so it can never create a
 * duplicate one.
 */
export type VehicleLocationUpdate = {
  lat: number;
  lng: number;
  bearing?: number | null;
  vehicleType?: string | null;
  kind?: LiveVehicleKind | null;
};

export type UseVehicleTrackingOptions = {
  /** Fallback kind when an update carries no recognizable vehicle type. */
  kind?: LiveVehicleKind;
  /**
   * Milliseconds without an update before `stale` flips true. The last known
   * position stays on the map meanwhile. `0` disables staleness detection.
   */
  staleAfter?: number;
};

export type UseVehicleTracking = {
  vehicle: LiveVehicle | null;
  /** True once no location has arrived for `staleAfter` ms. */
  stale: boolean;
  updatedAt: number | null;
  apply: (update: VehicleLocationUpdate) => void;
  reset: () => void;
};

const DEFAULT_STALE_AFTER = 15000;

/** Maps any backend vehicle label onto the four kinds the map can render. */
export function normalizeVehicleKind(
  value: string | null | undefined,
  fallback: LiveVehicleKind = 'car'
): LiveVehicleKind {
  if (!value) return fallback;
  return markerImageKeyFor(value);
}

/**
 * Turns a stream of location pings into a stable `LiveVehicle` prop for the
 * native map. Invalid coordinates are dropped (the previous fix is kept),
 * a missing bearing retains the last known heading, and a quiet stream flips
 * `stale` instead of clearing the marker — so a dropped socket never blanks
 * the ride.
 */
export function useVehicleTracking(
  options: UseVehicleTrackingOptions = {}
): UseVehicleTracking {
  const { kind, staleAfter = DEFAULT_STALE_AFTER } = options;

  const [vehicle, setVehicle] = useState<LiveVehicle | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kindRef = useRef<LiveVehicleKind | undefined>(kind);
  const staleAfterRef = useRef(staleAfter);

  useEffect(() => {
    kindRef.current = kind;
  }, [kind]);

  useEffect(() => {
    staleAfterRef.current = staleAfter;
  }, [staleAfter]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const armStaleness = useCallback(() => {
    clearTimer();
    const windowMs = staleAfterRef.current;
    if (!windowMs || windowMs <= 0) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setStale(true);
    }, windowMs);
  }, [clearTimer]);

  const apply = useCallback(
    (update: VehicleLocationUpdate) => {
      const position: LngLat = [update.lng, update.lat];
      if (!isValidLngLat(position)) return;

      setVehicle((prev) => {
        const nextKind =
          update.kind ??
          normalizeVehicleKind(update.vehicleType, kindRef.current ?? prev?.kind ?? 'car');
        const bearing =
          typeof update.bearing === 'number' && Number.isFinite(update.bearing)
            ? normalizeBearing(update.bearing)
            : prev?.bearing;
        return { lngLat: position, bearing, kind: nextKind };
      });

      setUpdatedAt(Date.now());
      setStale(false);
      armStaleness();
    },
    [armStaleness]
  );

  const reset = useCallback(() => {
    clearTimer();
    setVehicle(null);
    setUpdatedAt(null);
    setStale(false);
  }, [clearTimer]);

  return useMemo(
    () => ({ vehicle, stale, updatedAt, apply, reset }),
    [vehicle, stale, updatedAt, apply, reset]
  );
}
