import React, { useMemo, useRef } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme } from '../theme/mapTheme';
import { StyleSheet, View, StyleProp, ViewStyle, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { MARKER_IMAGES, MARKER_IMAGE_KEYS } from './markerImages';

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

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

/**
 * Shared empty defaults. A `[]` written inline in the destructuring signature
 * allocates a new array on every render, which would invalidate every `useMemo`
 * below and hand `source={{ html }}` a fresh string each time — and
 * react-native-webview reloads the whole page (Mapbox style + sprite refetch)
 * whenever `source` changes. That made the radar blank out on every parent
 * re-render and on every chip tap.
 */
const NO_MARKERS: MapMarker[] = [];
const NO_COORDINATES: [number, number][] = [];

export type MapPadding = { top?: number; bottom?: number; left?: number; right?: number } | number;

interface RealMapProps {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][]; // [longitude, latitude][]
  showUserLocation?: boolean; // NEW PROP
  pulseMarker?: { latitude: number, longitude: number }; // NEW PROP for finding driver
  mapPadding?: MapPadding; // NEW PROP to shift map center
  children?: React.ReactNode;
  onRegionChange?: (region: { latitude: number, longitude: number }) => void;
}

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
  onRegionChange
}: RealMapProps) {
  const { isDark } = useTheme();
  const theme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const webViewRef = useRef<any>(null);
  const bootRegionRef = useRef(region);
  const regionKey = JSON.stringify(region);
  const markersKey = JSON.stringify(markers);
  // Content-keyed, so callers can pass an inline array without a reload.
  const routeKey = JSON.stringify(routeCoordinates);
  const paddingKey = JSON.stringify(mapPadding);
  const pulseKey = JSON.stringify(pulseMarker);

  const isWebViewReady = useRef(false);
  const pendingInjections = useRef<string[]>([]);

  const safeInject = (js: string) => {
    if (isWebViewReady.current && webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    } else {
      pendingInjections.current.push(js);
    }
  };

  React.useEffect(() => {
    safeInject(`
      if (window.renderMarkers) {
        window.renderMarkers(${JSON.stringify(markers)});
      }
      true;
    `);
  }, [markersKey]);

  React.useEffect(() => {
    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2) || 12;
    safeInject(`
      if (window.flyToRegion) {
         window.flyToRegion(${region.longitude}, ${region.latitude}, ${zoom});
      }
      true;
    `);
  }, [regionKey]);

  const htmlContent = useMemo(() => {
    const styleUrl = theme.styleUrl;

    // Generate Route JS
    let routeJs = '';
    if (routeCoordinates && routeCoordinates.length > 0) {
      routeJs = `
        map.on('load', () => {
          map.addSource('route', {
            'type': 'geojson',
            'data': {
              'type': 'Feature',
              'properties': {},
              'geometry': {
                'type': 'LineString',
                'coordinates': ${JSON.stringify(routeCoordinates)}
              }
            }
          });
          map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
              'line-join': 'round',
              'line-cap': 'round'
            },
            'paint': {
              'line-color': '${theme.routeDone}',
              'line-width': 4
            }
          });

          // Automatically fit the map to the route bounds
          const coordinates = ${JSON.stringify(routeCoordinates)};
          const bounds = coordinates.reduce(function(bounds, coord) {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
          
          map.fitBounds(bounds, { padding: ${mapPadding ? JSON.stringify(mapPadding) : 50}, duration: 800 });
        });
      `;
    }

    // Pulse Marker JS
    let pulseJs = '';
    if (pulseMarker) {
      pulseJs = `
        map.on('load', () => {
          const pel = document.createElement('div');
          pel.className = 'pulse-marker';
          new mapboxgl.Marker({ element: pel })
            .setLngLat([${pulseMarker.longitude}, ${pulseMarker.latitude}])
            .addTo(map);
        });
      `;
    }

    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2) || 12;

    return `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="utf-8">
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css" rel="stylesheet">
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js"></script>
      <style>
      :root {
        --ematix-base: ${theme.base};
        --ematix-on-base: ${theme.onBase};
        --ematix-shadow: ${theme.shadow};
      }
      html, body { margin: 0; padding: 0; background: var(--ematix-base); touch-action: none; overflow: hidden; }
      #map { position: absolute; top: 0; bottom: 0; width: 100%; touch-action: none; }
      .mapboxgl-ctrl-attrib { font-size: 9px; opacity: 0.85; color: ${theme.attributionFg}; }
      .mapboxgl-ctrl-attrib a { color: ${theme.attributionFg}; }
      
      .customer-marker-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100px;
      }
      .customer-beacon {
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: levitate 2.5s ease-in-out infinite;
        z-index: 2;
      }
      .customer-beacon-label {
        background-color: #ff6b00; /* Ematix Orange */
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-weight: 600;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 999px;
        box-shadow: 0 3px 6px rgba(0,0,0,0.25);
        margin-bottom: -1px; /* Overlap stem slightly */
      }
      .customer-beacon-stem {
        width: 2px;
        height: 18px;
        background-color: #ff6b00;
      }
      .customer-beacon-base {
        width: 14px;
        height: 14px;
        background-color: #ff6b00;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      .customer-beacon-base-inner {
        width: 5px;
        height: 5px;
        background-color: white;
        border-radius: 50%;
      }
      .customer-beacon-halo {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 32px;
        height: 32px;
        background-color: rgba(255, 107, 0, 0.25);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: -1;
      }
      .customer-beacon-shadow {
        position: absolute;
        bottom: 2px;
        left: 50%;
        width: 30px;
        height: 8px;
        background: linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%);
        transform-origin: left center;
        transform: skewX(-50deg);
        border-radius: 50%;
        z-index: -2;
        animation: shadow-pulse 2.5s ease-in-out infinite;
      }
      @keyframes levitate {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes shadow-pulse {
        0%, 100% { transform: skewX(-50deg) scaleX(1); opacity: 0.8; }
        50% { transform: skewX(-50deg) scaleX(0.7); opacity: 0.4; }
      }

      .custom-popup .mapboxgl-popup-content {
        border-radius: 8px;
        padding: 4px 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .custom-popup .mapboxgl-popup-tip {
        border-top-color: white;
      }

      .custom-title-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        transform-origin: bottom center;
        z-index: 2;
      }
      .title-marker-label {
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: bold;
        font-family: sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        margin-bottom: -4px;
        white-space: nowrap;
        position: relative;
        z-index: 2;
      }
      .title-marker-pin {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2.5px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        margin: 0 auto;
        position: relative;
        z-index: 1;
      }

      .pulse-marker {
        width: 32px;
        height: 32px;
        background-color: ${theme.routeDone};
        border-radius: 50%;
        position: relative;
      }
      .pulse-marker::after {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        background-color: var(--ematix-on-base);
        border-radius: 50%;
      }
      .pulse-marker::before {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        background-color: ${theme.brandTint};
        border-radius: 50%;
        animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        z-index: -1;
      }
      @keyframes pulse-ring {
        0% {
          width: 32px;
          height: 32px;
          opacity: 1;
        }
        100% {
          width: 250px;
          height: 250px;
          opacity: 0;
        }
      }
      </style>
      </head>
      <body>
      <div id="map"></div>
      <script>
      window.MARKER_IMAGES = ${JSON.stringify(MARKER_IMAGES)};
      window.MARKER_IMAGE_KEYS = ${JSON.stringify(MARKER_IMAGE_KEYS)};
      mapboxgl.accessToken = '${MAPBOX_TOKEN}';
      const map = new mapboxgl.Map({
          container: 'map',
          style: '${styleUrl}',
          center: [${bootRegionRef.current.longitude}, ${bootRegionRef.current.latitude}],
          zoom: ${zoom},
          interactive: ${interactive}
      });
      
      let targetCenter = null;
      let targetZoom = null;
      window.flyToRegion = function(lng, lat, zoom) {
        if (typeof map !== 'undefined' && map.isStyleLoaded()) {
           map.flyTo({ center: [lng, lat], zoom: zoom, speed: 1.2 });
        } else {
           targetCenter = [lng, lat];
           targetZoom = zoom;
        }
      };

      window.currentMarkers = window.currentMarkers || {};
      // Markers are never baked into the HTML: that would change \`source\` on
      // every \`partner_location_updated\` ping and reload the whole map. The
      // effect above pushes them through \`renderMarkers\`, which parks them in
      // \`pendingMarkersData\` whenever the style is still loading.

      window.renderMarkers = function(markersData) {
        if (typeof map === 'undefined' || !map.isStyleLoaded()) {
          window.pendingMarkersData = markersData;
          return;
        }

        if (window.currentMarkers) {
          Object.keys(window.currentMarkers).forEach(function(key) {
            if (window.currentMarkers[key]) {
              try { window.currentMarkers[key].remove(); } catch(e) {}
            }
          });
        }
        window.currentMarkers = {};

        if (!Array.isArray(markersData)) return;

        markersData.forEach(function(m) {
          if (!m || typeof m.latitude !== 'number' || typeof m.longitude !== 'number') return;
          if (isNaN(m.latitude) || isNaN(m.longitude)) return;

          try {
            if (m.id === 'me') {
              var el = document.createElement('div');
              el.className = 'customer-marker-wrapper';
              el.innerHTML = '<div class="customer-beacon"><div class="customer-beacon-label">You are here</div><div class="customer-beacon-stem"></div><div class="customer-beacon-base"><div class="customer-beacon-halo"></div><div class="customer-beacon-base-inner"></div></div></div><div class="customer-beacon-shadow"></div>';
              var marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([m.longitude, m.latitude])
                .addTo(map);
              window.currentMarkers[m.id] = marker;
            } else if (m.vehicleType) {
              var keys = window.MARKER_IMAGE_KEYS || {};
              var imgKey = keys[m.vehicleType] || keys[String(m.vehicleType).toLowerCase()] || 'car';
              var imgUrl = (window.MARKER_IMAGES && window.MARKER_IMAGES[imgKey]) || (window.MARKER_IMAGES && window.MARKER_IMAGES.car);
              if (!imgUrl) return;
              var vEl = document.createElement('div');
              vEl.className = 'vehicle-marker';
              vEl.style.backgroundImage = "url('" + imgUrl + "')";
              vEl.style.width = '48px';
              vEl.style.height = '48px';
              vEl.style.backgroundSize = 'contain';
              vEl.style.backgroundRepeat = 'no-repeat';
              vEl.style.backgroundPosition = 'center';
              vEl.style.filter = 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))';

              var vMarker = new mapboxgl.Marker({ element: vEl })
                .setLngLat([m.longitude, m.latitude])
                .addTo(map);
              window.currentMarkers[m.id] = vMarker;
            } else if (m.title) {
              var el = document.createElement('div');
              el.className = 'custom-title-marker';
              el.style.display = 'block';
              
              var label = document.createElement('div');
              label.innerText = m.title;
              label.className = 'title-marker-label';
              label.style.backgroundColor = m.color || '#333';
              
              var pin = document.createElement('div');
              pin.className = 'title-marker-pin';
              pin.style.backgroundColor = m.color || '#333';
              
              el.appendChild(label);
              el.appendChild(pin);
              
              var cMarker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([m.longitude, m.latitude])
                .addTo(map);
              window.currentMarkers[m.id] = cMarker;
            } else {
              var cMarker = new mapboxgl.Marker({ color: m.color || '#000000' })
                .setLngLat([m.longitude, m.latitude])
                .addTo(map);
              window.currentMarkers[m.id] = cMarker;
            }
          } catch(err) {
            console.error('Error rendering marker:', m, err);
          }
        });
      };

      map.on('load', () => {
         if (targetCenter) {
            map.flyTo({ center: targetCenter, zoom: targetZoom, speed: 1.2 });
            targetCenter = null;
         }
         if (window.pendingMarkersData) {
            window.renderMarkers(window.pendingMarkersData);
            window.pendingMarkersData = null;
         }
      });

      map.on('moveend', () => {
        if (window.ReactNativeWebView) {
          const center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'regionChange', latitude: center.lat, longitude: center.lng }));
        }
      });
      ${routeJs}
      ${pulseJs}
      </script>
      </body>
      </html>
    `;
    // `routeCoordinates` is inlined into `routeJs`, so a route change must
    // invalidate this memo; `routeKey` is its content key, not its identity, so
    // an inline array from the caller does not force a reload. Markers are
    // intentionally excluded - they are pushed in via `renderMarkers`.
    // RealMap has no command bridge, so the theme is baked in and the WebView
    // re-keys on toggle. That is fine here: it is a static preview map, never a
    // live ride whose camera or follow mode would be lost.
  }, [interactive, routeKey, showUserLocation, pulseKey, theme, paddingKey]);

  return (
    <View style={[styles.container, { backgroundColor: theme.base }, style]}>
      <WebView
        ref={webViewRef}
        key={isDark ? 'dark_v3' : 'light_v3'}
        source={{ html: htmlContent, baseUrl: 'https://localhost/' }}
        style={StyleSheet.absoluteFill}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        pointerEvents={interactive ? 'auto' : 'none'}
        bounces={false}
        scrollEnabled={false}
        overScrollMode="never"
        geolocationEnabled={true}
        onLoadStart={() => {
          // The document is being replaced, so `injectJavaScript` would be a
          // no-op at best and land in the discarded context at worst. Queue
          // instead, `onLoadEnd` replays the queue against the new document.
          isWebViewReady.current = false;
        }}
        onLoadEnd={() => {
          isWebViewReady.current = true;
          if (webViewRef.current && pendingInjections.current.length > 0) {
            pendingInjections.current.forEach(js => webViewRef.current?.injectJavaScript(js));
            pendingInjections.current = [];
          }
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'regionChange' && onRegionChange) {
              onRegionChange({ latitude: data.latitude, longitude: data.longitude });
            }
          } catch (e) { }
        }}
      />
      {children ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  }
});
