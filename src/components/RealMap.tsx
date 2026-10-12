import React, { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import NativeMapView from './map/NativeMapView';
import { markersFromLegacy, type NativeMapMarker } from './map/mapTypes';
import type { LiveRoute } from './liveMapTypes';

/**
 * Phase 7 — `RealMap` is now a thin adapter over the shared native map.
 *
 * The public surface (props, `MapRegion`, `MapMarker`, `CHENNAI_REGION`) is
 * unchanged so booking screens keep working; each prop is translated into the
 * native contract. The WebView implementation that used to live here is gone.
 */

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  color?: string; // Hex color or basic string like 'red', 'green'
  vehicleType?: string;
  title?: string;
};

export const CHENNAI_REGION: MapRegion = {
  latitude: 13.0316,
  longitude: 80.2341,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export type MapPadding =
  | { top?: number; bottom?: number; left?: number; right?: number }
  | number;

interface RealMapProps {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][]; // [longitude, latitude][]
  showUserLocation?: boolean; // NEW PROP
  pulseMarker?: { latitude: number; longitude: number }; // NEW PROP for finding driver
  mapPadding?: MapPadding; // NEW PROP to shift map center
  children?: React.ReactNode;
  onRegionChange?: (region: { latitude: number; longitude: number }) => void;
}

const NO_MARKERS: MapMarker[] = [];
const NO_COORDINATES: [number, number][] = [];

export default function RealMap({
  style,
  region = CHENNAI_REGION,
  interactive = false,
  markers = NO_MARKERS,
  routeCoordinates = NO_COORDINATES,
  showUserLocation = false,
  pulseMarker,
  mapPadding,
  children,
  onRegionChange,
}: RealMapProps) {
  const markersForMap = useMemo<NativeMapMarker[]>(() => {
    const list = markersFromLegacy(markers);
    if (
      pulseMarker &&
      Number.isFinite(pulseMarker.latitude) &&
      Number.isFinite(pulseMarker.longitude)
    ) {
      list.push({
        id: 'pulse',
        lngLat: [pulseMarker.longitude, pulseMarker.latitude],
        kind: 'pulse',
      });
    }
    return list;
  }, [markers, pulseMarker]);

  const route = useMemo<LiveRoute | null>(
    () => (routeCoordinates.length >= 2 ? { coordinates: routeCoordinates } : null),
    [routeCoordinates]
  );

  return (
    <NativeMapView
      style={style}
      region={region}
      interactive={interactive}
      markers={markersForMap}
      route={route}
      showUserLocation={showUserLocation}
      mapPadding={mapPadding}
      onRegionChange={onRegionChange}
    >
      {children}
    </NativeMapView>
  );
}
