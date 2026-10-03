import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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
  center?: LngLat;
  zoom?: number;
  mapStyle?: string;
  route?: LiveRoute | null;
  pins?: LivePin[];
  vehicle?: LiveVehicle | null;
  follow?: boolean;
  edgePadding?: number;
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

  // Frozen on first render: rewriting `srcDoc` remounts the iframe, which
  // would reset the camera and drop follow mode mid-ride.
  const bootStyleRef = useRef(mapStyle ?? mapStyleForTheme(isDark));
  const bootThemeRef = useRef(theme);

  const frameRef = useRef<any>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{ command: string; args: unknown[] }[]>([]);
  const followRef = useRef(follow);
  const cameraRef = useRef<{ center: LngLat; zoom: number } | null>(null);
  const fittedRouteRef = useRef<string>('');
  const themeSentRef = useRef(false);

  const initialCenter = useMemo<LngLat>(
    () => center ?? [region.longitude, region.latitude],
    [center, region.longitude, region.latitude]
  );
  const initialZoom = useMemo(() => zoom ?? zoomFromRegion(region), [zoom, region]);

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
    const frame = frameRef.current?.contentWindow;
    if (!frame) return;
    if (!readyRef.current) {
      pendingRef.current.push({ command, args });
      return;
    }
    frame.postMessage(
      JSON.stringify({ source: 'ematix-live-map-host', command, args }),
      '*'
    );
  }, []);

  useEffect(() => {
    readyRef.current = false;
    pendingRef.current = [];
    cameraRef.current = null;
    fittedRouteRef.current = '';
  }, [html]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      let data: unknown = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      const envelope = data as HostEnvelope | null;
      if (!envelope || envelope.source !== 'ematix-live-map') return;

      switch (envelope.event) {
        case 'ready': {
          readyRef.current = true;
          const queued = pendingRef.current;
          pendingRef.current = [];
          const frame = frameRef.current?.contentWindow;
          if (frame) {
            queued.forEach((item) =>
              frame.postMessage(
                JSON.stringify({ source: 'ematix-live-map-host', ...item }),
                '*'
              )
            );
          }
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
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onPress, onUserMove, onReady, onError]);

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
  // need to cross the bridge. `call` queues while the iframe is still loading.
  useEffect(() => {
    if (!themeSentRef.current) {
      themeSentRef.current = true;
      return;
    }
    call('setTheme', theme);
  }, [theme, call]);

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
      <iframe
        ref={frameRef}
        title="live-map"
        srcDoc={html}
        frameBorder={0}
        scrolling="no"
        style={{
          border: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
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
