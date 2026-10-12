import React, { forwardRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import NativeMapView from './map/NativeMapView';
import type { NativeMapHandle, MapPadding } from './map/mapTypes';
import {
  CHENNAI_REGION,
  type LivePin,
  type LiveRoute,
  type LiveVehicle,
  type LngLat,
  type MapRegion,
} from './liveMapTypes';

export type {
  LivePin,
  LiveRoute,
  LiveVehicle,
  LiveVehicleKind,
  LngLat,
  MapRegion,
} from './liveMapTypes';
export { CHENNAI_REGION, LIVE_MAP_STYLE, VEHICLE_COLORS } from './liveMapTypes';
export { buildMapTheme, LIVE_MAP_DARK_STYLE, type MapThemeTokens } from '../theme/mapTheme';

/**
 * Phase 7 — `LiveMap` keeps its public API (props + imperative handle) but the
 * Android implementation is now the shared native map. The WebView command
 * bridge is gone; camera control is delegated to `NativeMapView`.
 */

export type LiveMapHandle = NativeMapHandle;

export type LiveMapProps = {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  /** Initial camera. Later changes animate instead of reloading the map. */
  center?: LngLat;
  zoom?: number;
  mapStyle?: string;
  route?: LiveRoute | null;
  pins?: LivePin[];
  vehicle?: LiveVehicle | null;
  follow?: boolean;
  edgePadding?: number;
  mapPadding?: MapPadding;
  /** Fit the camera when a new route endpoint pair arrives. Defaults to true. */
  fitOnRouteChange?: boolean;
  onPress?: (lngLat: LngLat) => void;
  onUserMove?: () => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  children?: React.ReactNode;
};

const NO_PINS: LivePin[] = [];

const LiveMap = forwardRef<LiveMapHandle, LiveMapProps>(function LiveMap(props, ref) {
  const {
    style,
    region = CHENNAI_REGION,
    interactive = false,
    center,
    zoom,
    mapStyle,
    route = null,
    pins = NO_PINS,
    vehicle = null,
    follow = false,
    edgePadding = 72,
    mapPadding,
    fitOnRouteChange = true,
    onPress,
    onUserMove,
    onReady,
    onError,
    children,
  } = props;

  return (
    <NativeMapView
      ref={ref}
      style={style}
      region={region}
      center={center}
      zoom={zoom}
      interactive={interactive}
      mapStyle={mapStyle}
      route={route}
      pins={pins}
      vehicle={vehicle}
      follow={follow}
      edgePadding={edgePadding}
      mapPadding={mapPadding}
      fitOnRouteChange={fitOnRouteChange}
      onPress={onPress}
      onUserMove={onUserMove}
      onReady={onReady}
      onError={onError}
    >
      {children}
    </NativeMapView>
  );
});

export default LiveMap;
