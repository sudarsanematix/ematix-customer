import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Camera,
  MapView,
  UserLocation,
  type CameraPadding,
  type MapState,
  type ScreenPointPayload,
} from '@rnmapbox/maps';
import { useTheme } from '../../theme/ThemeProvider';
import { buildMapTheme } from '../../theme/mapTheme';
import { CHENNAI_REGION } from '../liveMapTypes';
import NativeMapControls from './NativeMapControls';
import NativeMapMarkers from './NativeMapMarkers';
import NativeMapRoutes from './NativeMapRoutes';
import {
  FIT_DURATION,
  FLY_DURATION,
  FOCUS_ZOOM,
  FOLLOW_DURATION,
  FOLLOW_EASE_DURATION,
  centerOn,
  fitPoints,
  routeEndpointsKey,
  toCameraStop,
} from './mapCamera';
import { isValidLngLat, zoomForDelta } from './mapCoordinates';
import {
  markerFromVehicle,
  markersFromPins,
  type LngLat,
  type NativeMapHandle,
  type NativeMapMarker,
  type NativeMapProps,
} from './mapTypes';

const NO_MARKERS: NativeMapMarker[] = [];
const NO_PINS: [] = [];
const DEFAULT_EDGE_PADDING = 72;
/** Fallback zoom when neither `zoom` nor a usable `region.longitudeDelta` exists. */
const BOOT_ZOOM = 12;

function collectPoints(route: NativeMapProps['route'], markers: NativeMapMarker[]): LngLat[] {
  const points: LngLat[] = [];
  (route?.coordinates ?? []).forEach((point) => {
    if (isValidLngLat(point)) points.push(point);
  });
  markers.forEach((marker) => {
    if (isValidLngLat(marker.lngLat)) points.push(marker.lngLat);
  });
  return points;
}

const NativeMapView = forwardRef<NativeMapHandle, NativeMapProps>(function NativeMapView(
  props,
  ref
) {
  const {
    style,
    region = CHENNAI_REGION,
    center,
    zoom,
    interactive = false,
    mapStyle,
    theme: themeOverride,
    markers = NO_MARKERS,
    route = null,
    progressAt,
    vehicle = null,
    pins = NO_PINS,
    follow = false,
    fitOnRouteChange = true,
    edgePadding = DEFAULT_EDGE_PADDING,
    showUserLocation = false,
    mapPadding,
    selectionPoint,
    onPress,
    onUserMove,
    onRegionChange,
    onReady,
    onError,
    children,
  } = props;

  const { isDark } = useTheme();
  const theme = themeOverride ?? buildMapTheme(isDark);

  const mapViewRef = useRef<any>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const cameraRef = useRef<Camera>(null);
  const followRef = useRef(follow);
  const gestureRef = useRef(false);
  const readyRef = useRef(false);
  const mountedRef = useRef(false);
  const fittedKeyRef = useRef('');

  const {
    longitude: regionLongitude,
    latitude: regionLatitude,
    longitudeDelta: regionLongitudeDelta,
  } = region;

  const initialCenter = useMemo<LngLat>(() => {
    if (center && isValidLngLat(center)) return center;
    if (Number.isFinite(regionLongitude) && Number.isFinite(regionLatitude)) {
      return [regionLongitude, regionLatitude];
    }
    return [CHENNAI_REGION.longitude, CHENNAI_REGION.latitude];
  }, [center, regionLongitude, regionLatitude]);
  const initialZoom = useMemo(() => {
    const candidate = zoom ?? zoomForDelta(regionLongitudeDelta);
    return Number.isFinite(candidate) ? candidate : BOOT_ZOOM;
  }, [zoom, regionLongitudeDelta]);

  const padding = useMemo<CameraPadding>(() => {
    if (typeof mapPadding === 'number') {
      return {
        paddingTop: mapPadding,
        paddingBottom: mapPadding,
        paddingLeft: mapPadding,
        paddingRight: mapPadding,
      };
    }
    if (Array.isArray(mapPadding) && mapPadding.length === 4) {
      return {
        paddingTop: mapPadding[0],
        paddingRight: mapPadding[1],
        paddingBottom: mapPadding[2],
        paddingLeft: mapPadding[3],
      };
    }
    if (mapPadding && typeof mapPadding === 'object') {
      const p = mapPadding as Record<string, number | undefined>;
      return {
        paddingTop: p.top ?? p.paddingTop ?? edgePadding,
        paddingBottom: p.bottom ?? p.paddingBottom ?? edgePadding,
        paddingLeft: p.left ?? p.paddingLeft ?? edgePadding,
        paddingRight: p.right ?? p.paddingRight ?? edgePadding,
      };
    }
    return {
      paddingTop: edgePadding,
      paddingBottom: edgePadding,
      paddingLeft: edgePadding,
      paddingRight: edgePadding,
    };
  }, [mapPadding, edgePadding]);

  const renderedMarkers = useMemo<NativeMapMarker[]>(() => {
    const list = [...markers];
    if (vehicle) list.push(markerFromVehicle(vehicle));
    if (pins.length) list.push(...markersFromPins(pins));
    return list;
  }, [markers, vehicle, pins]);

  const vehicleKey = vehicle ? `${vehicle.lngLat[0]},${vehicle.lngLat[1]}` : '';

  const routeProgressAt = useMemo<LngLat | null>(() => {
    if (progressAt && isValidLngLat(progressAt)) return progressAt;
    if (vehicle && isValidLngLat(vehicle.lngLat)) return vehicle.lngLat;
    return null;
  }, [progressAt, vehicle]);

  // Land the boot camera on the initial center/zoom (defaultSettings), then
  // animate on every later center/zoom change instead of remounting the map.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // Follow mode owns the camera, so a center/zoom prop change must not yank
    // it away from the tracked vehicle.
    if (followRef.current) return;
    cameraRef.current?.setCamera({
      centerCoordinate: initialCenter,
      zoomLevel: initialZoom,
      animationDuration: FLY_DURATION,
      animationMode: 'flyTo',
    });
  }, [initialCenter, initialZoom]);

  // The `follow` prop is authoritative for the follow flag; turning it on
  // recenters once. A user gesture clears the internal flag (see
  // `handleCameraChanged`) without the prop changing, exactly like the WebView
  // bridge's `following` state.
  useEffect(() => {
    followRef.current = follow;
    if (follow && vehicle && isValidLngLat(vehicle.lngLat)) {
      centerOn(cameraRef.current, vehicle.lngLat, { duration: FOLLOW_EASE_DURATION });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow]);

  // Vehicle motion recenters only while follow is still armed, so the camera
  // never fights a manual pan.
  useEffect(() => {
    if (!followRef.current || !vehicle || !isValidLngLat(vehicle.lngLat)) return;
    centerOn(cameraRef.current, vehicle.lngLat, { duration: FOLLOW_DURATION });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleKey]);

  // Fit the camera once per new route endpoint pair. Skipped while following a
  // vehicle so the two camera owners cannot fight each other.
  useEffect(() => {
    if (!fitOnRouteChange) return;
    if (followRef.current && vehicle) return;
    const coordinates = route?.coordinates ?? [];
    if (coordinates.length < 2) return;
    const key = routeEndpointsKey(coordinates);
    if (!key || fittedKeyRef.current === key) return;
    fittedKeyRef.current = key;
    fitPoints(cameraRef.current, coordinates, { padding: mapPadding ?? padding, duration: FIT_DURATION });
  }, [fitOnRouteChange, route, mapPadding, padding, vehicle]);

  const handleReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);

  const handleStyleError = useCallback(() => {
    onError?.('map style failed to load');
  }, [onError]);

  const handleMapError = useCallback(() => {
    onError?.('map failed to load');
  }, [onError]);

  const handlePress = useCallback(
    (feature: GeoJSON.Feature<GeoJSON.Point, ScreenPointPayload>) => {
      // Non-interactive maps ignore taps, matching the WebView's pointerEvents
      // of `none` (RealMap preview maps vs. interactive LiveMap screens).
      if (!interactive) return;
      const coordinates = feature?.geometry?.coordinates;
      if (isValidLngLat(coordinates)) onPress?.(coordinates);
    },
    [interactive, onPress]
  );

  // A user gesture that reaches the map cancels follow, mirroring the WebView
  // bridge's `dragstart` -> `userMoved` contract.
  const handleCameraChanged = useCallback(
    (state: MapState) => {
      const active = !!state?.gestures?.isGestureActive;
      if (!active) {
        gestureRef.current = false;
        return;
      }
      if (gestureRef.current) return;
      gestureRef.current = true;
      if (followRef.current) {
        followRef.current = false;
        onUserMove?.();
      }
    },
    [onUserMove]
  );

  const handleIdle = useCallback(
    async (state: MapState) => {
      if (!onRegionChange) return;

      // Prefer the geographic point directly under the fixed pin.
      if (
        selectionPoint &&
        mapSize.width > 0 &&
        mapSize.height > 0
      ) {
        try {
          const screenX = mapSize.width * selectionPoint.xRatio;
          const screenY = mapSize.height * selectionPoint.yRatio;
          const coordinates = await mapViewRef.current?.getCoordinateFromView([
            screenX,
            screenY,
          ]);
          if (coordinates && isValidLngLat(coordinates)) {
            onRegionChange({
              longitude: coordinates[0],
              latitude: coordinates[1],
            });
            return;
          }
        } catch (error) {
          console.warn(
            'Failed to resolve selection pin coordinates:',
            error
          );
        }
      }

      // Fallback for maps that don't use a selection pin.
      const center = state?.properties?.center;
      if (center && isValidLngLat(center)) {
        onRegionChange({
          longitude: center[0],
          latitude: center[1],
        });
      }
    },
    [onRegionChange, selectionPoint, mapSize]
  );

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (target) => {
        if (!target) return;
        const stop = toCameraStop(target);
        if (stop.centerCoordinate === undefined && stop.zoomLevel === undefined) return;
        cameraRef.current?.setCamera(stop);
      },
      fitAll: (options) => {
        fitPoints(cameraRef.current, collectPoints(route, renderedMarkers), {
          padding: options?.padding ?? mapPadding ?? padding,
          duration: options?.duration ?? FIT_DURATION,
        });
      },
      focusVehicle: () => {
        followRef.current = true;
        if (vehicle) {
          cameraRef.current?.setCamera({
            centerCoordinate: vehicle.lngLat,
            zoomLevel: FOCUS_ZOOM,
            animationDuration: FIT_DURATION,
            animationMode: 'easeTo',
          });
        }
      },
      setFollow: (value) => {
        followRef.current = value;
        if (value && vehicle) {
          centerOn(cameraRef.current, vehicle.lngLat, { duration: FOLLOW_EASE_DURATION });
        }
      },
    }),
    [route, renderedMarkers, vehicle, edgePadding]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.base }, style]}>
      <MapView
        ref={mapViewRef}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setMapSize((previous) => {
            if (
              previous.width === width &&
              previous.height === height
            ) {
              return previous;
            }
            return { width, height };
          });
        }}
        style={StyleSheet.absoluteFill}
        styleURL={mapStyle ?? theme.styleUrl}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        attributionEnabled
        logoEnabled={false}
        compassEnabled={interactive}
        scaleBarEnabled={false}
        onDidFinishLoadingStyle={handleReady}
        onMapLoadingError={handleStyleError}
        onDidFailLoadingMap={handleMapError}
        onPress={handlePress}
        onCameraChanged={handleCameraChanged}
        onMapIdle={handleIdle}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: initialCenter,
            zoomLevel: initialZoom,
            animationDuration: 0,
          }}
          padding={padding}
        />
        {showUserLocation ? <UserLocation visible /> : null}
        <NativeMapRoutes route={route} progressAt={routeProgressAt} theme={theme} />
        <NativeMapMarkers markers={renderedMarkers} theme={theme} />
      </MapView>
      <NativeMapControls>{children}</NativeMapControls>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
});

export default NativeMapView;
