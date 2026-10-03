import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme, LIVE_MAP_DARK_STYLE } from '../theme/mapTheme';

import { buildLiveMapHtml } from './liveMapHtml';
import {
  CHENNAI_REGION,
  LIVE_MAP_STYLE,
  mapStyleForTheme,
  zoomFromRegion,
  type LiveMapCamera,
  type LiveMapFitOptions,
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

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

export type LiveMapHandle = {
  flyTo: (target?: LiveMapCamera | null) => void;
  fitAll: (options?: LiveMapFitOptions | null) => void;
  focusVehicle: () => void;
  setFollow: (value: boolean) => void;
};

export type LiveMapProps = {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  /** Initial camera. Later changes animate instead of reloading the WebView. */
  center?: LngLat;
  zoom?: number;
  mapStyle?: string;
  route?: LiveRoute | null;
  pins?: LivePin[];
  vehicle?: LiveVehicle | null;
  follow?: boolean;
  edgePadding?: number;
  /** Fit the camera when a new route endpoint pair arrives. Defaults to true. */
  fitOnRouteChange?: boolean;
  onPress?: (lngLat: LngLat) => void;
  onUserMove?: () => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  children?: React.ReactNode;
};

type HostEnvelope = {
  source?: string;
  event?: string;
  payload?: Record<string, unknown>;
};

const LiveMap = forwardRef<LiveMapHandle, LiveMapProps>(function LiveMap(props, ref) {
  const { isDark } = useTheme();
  const theme = useMemo(() => buildMapTheme(isDark), [isDark]);

  const {
    style,
    region = CHENNAI_REGION,
    interactive = false,
    center,
    zoom,
    mapStyle,
    route = null,
    pins = [],
    vehicle = null,
    follow = false,
    edgePadding = 72,
    fitOnRouteChange = true,
    onPress,
    onUserMove,
    onReady,
    onError,
    children,
  } = props;

  // The basemap and the document theme are boot-time values. Changing the
  // `source` prop reloads the WebView, which would reset the camera and drop
  // follow mode mid-ride, so both are frozen on first render and later theme
  // changes travel over the command bridge via `setTheme` instead.
  const bootStyleRef = useRef(mapStyle ?? mapStyleForTheme(isDark));
  const bootThemeRef = useRef(theme);

  const webViewRef = useRef<any>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<string[]>([]);
  const followRef = useRef(follow);
  const cameraRef = useRef<{ center: LngLat; zoom: number } | null>(null);
  const fittedRouteRef = useRef<string>('');
  const themeSentRef = useRef(false);

  const initialCenter = useMemo<LngLat>(
    () => center ?? [region.longitude, region.latitude],
    [center, region.longitude, region.latitude]
  );
  const initialZoom = useMemo(() => zoom ?? zoomFromRegion(region), [zoom, region]);

  // The document is built once. Route/pins/vehicle/follow/theme are delivered
  // over the command bridge so the WebView never reloads while a ride runs.
  const html = useMemo(
    () =>
      buildLiveMapHtml({
        accessToken: MAPBOX_TOKEN,
        style: bootStyleRef.current,
        center: initialCenter,
        zoom: initialZoom,
        interactive,
        padding: edgePadding,
        route,
        pins,
        vehicle,
        follow,
        theme: bootThemeRef.current,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interactive, edgePadding]
  );

  const call = useCallback((command: string, ...args: unknown[]) => {
    const encoded = args
      .map((arg) => JSON.stringify(arg === undefined ? null : arg))
      .join(',');
    const script = `window.__EMATIX_LIVE_MAP__ && window.__EMATIX_LIVE_MAP__.${command}(${encoded}); true;`;

    if (readyRef.current) {
      webViewRef.current?.injectJavaScript(script);
      return;
    }
    pendingRef.current.push(script);
  }, []);

  // Declared first so it clears the queue before state effects repopulate it.
  useEffect(() => {
    readyRef.current = false;
    pendingRef.current = [];
    cameraRef.current = null;
    fittedRouteRef.current = '';
  }, [html]);

  useEffect(() => {
    const previous = cameraRef.current;
    cameraRef.current = { center: initialCenter, zoom: initialZoom };
    if (!previous) return;
    if (
      previous.center[0] === initialCenter[0] &&
      previous.center[1] === initialCenter[1] &&
      previous.zoom === initialZoom
    ) {
      return;
    }
    call('flyTo', { lngLat: initialCenter, zoom: initialZoom, duration: 800 });
  }, [initialCenter, initialZoom, call]);

  useEffect(() => {
    call('setRoute', route);
  }, [route, call]);

  useEffect(() => {
    call('setPins', pins);
  }, [pins, call]);

  useEffect(() => {
    call('setVehicle', vehicle);
  }, [vehicle, call]);

  useEffect(() => {
    followRef.current = follow;
    call('setFollow', follow);
  }, [follow, call]);

  useEffect(() => {
    if (!fitOnRouteChange) return;
    const coordinates = route?.coordinates ?? [];
    if (coordinates.length < 2) return;
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    const key = `${first[0]},${first[1]}|${last[0]},${last[1]}`;
    if (fittedRouteRef.current === key) return;
    fittedRouteRef.current = key;
    call('fitAll', { padding: edgePadding, duration: 700 });
  }, [route, fitOnRouteChange, edgePadding, call]);

  // The first document already carries the boot theme, so only later toggles
  // need to cross the bridge. `call` queues while the map is still loading.
  useEffect(() => {
    if (!themeSentRef.current) {
      themeSentRef.current = true;
      return;
    }
    call('setTheme', theme);
  }, [theme, call]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let envelope: HostEnvelope;
      try {
        envelope = JSON.parse(event.nativeEvent.data) as HostEnvelope;
      } catch {
        return;
      }
      if (!envelope || envelope.source !== 'ematix-live-map') return;

      switch (envelope.event) {
        case 'ready': {
          readyRef.current = true;
          const queued = pendingRef.current;
          pendingRef.current = [];
          queued.forEach((script) => webViewRef.current?.injectJavaScript(script));
          onReady?.();
          break;
        }
        case 'press': {
          const point = envelope.payload?.lngLat as LngLat | undefined;
          if (point && onPress) onPress(point);
          break;
        }
        case 'userMoved': {
          followRef.current = false;
          onUserMove?.();
          break;
        }
        case 'error': {
          onError?.(String(envelope.payload?.message ?? 'map error'));
          break;
        }
        default:
          break;
      }
    },
    [onPress, onUserMove, onReady, onError]
  );

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (target) => call('flyTo', target ?? null),
      fitAll: (options) => call('fitAll', options ?? null),
      focusVehicle: () => {
        followRef.current = true;
        call('focusVehicle', null);
      },
      setFollow: (value) => {
        followRef.current = value;
        call('setFollow', value);
      },
    }),
    [call]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.base }, style]}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://localhost/' }}
        style={StyleSheet.absoluteFill}
        onMessage={handleMessage}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        pointerEvents={interactive ? 'auto' : 'none'}
        geolocationEnabled={false}
      />
      {children ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      ) : null}
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

export default LiveMap;
