import React, { useMemo } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme } from '../theme/mapTheme';
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
  color?: string;
  vehicleType?: string;
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
 * allocates a new array every render, which would invalidate the `htmlContent`
 * memo below and hand the `<iframe>` a fresh `srcDoc` each time, remounting the
 * map on every parent re-render. See the native `RealMap.tsx` for the same fix.
 */
const NO_MARKERS: MapMarker[] = [];
const NO_COORDINATES: [number, number][] = [];

interface RealMapProps {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][]; // [longitude, latitude][]
  showUserLocation?: boolean;
  children?: React.ReactNode;
  onRegionChange?: (region: { latitude: number, longitude: number }) => void;
}

export default function RealMap({ style, region = CHENNAI_REGION, interactive = false, markers = NO_MARKERS, routeCoordinates = NO_COORDINATES, showUserLocation = false, children, onRegionChange }: RealMapProps) {
  const { isDark } = useTheme();
  const theme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const bootRegionRef = React.useRef(region);
  const regionKey = JSON.stringify(region);
  const markersKey = JSON.stringify(markers);
  // Content-keyed, so callers can pass an inline array without a remount.
  const routeKey = JSON.stringify(routeCoordinates);

  const isIframeReady = React.useRef(false);
  const pendingMessages = React.useRef<any[]>([]);

  const safePostMessage = (msg: any) => {
    if (isIframeReady.current && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify(msg), '*');
    } else {
      pendingMessages.current.push(msg);
    }
  };

  React.useEffect(() => {
    safePostMessage({ type: 'renderMarkers', markers });
  }, [markersKey]);

  React.useEffect(() => {
    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2) || 12;
    safePostMessage({ type: 'flyTo', latitude: region.latitude, longitude: region.longitude, zoom });
  }, [regionKey]);

  const htmlContent = useMemo(() => {

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
          
          map.fitBounds(bounds, { padding: 50, duration: 800 });
        });
      `;
    }

    const zoom = Math.round(Math.log(360 / bootRegionRef.current.longitudeDelta) / Math.LN2) || 12;

    return `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="utf-8">
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css" rel="stylesheet">
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js"></script>
      <style>
      html, body { margin: 0; padding: 0; background: ${theme.base}; }
      #map { position: absolute; top: 0; bottom: 0; width: 100%; }
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
        margin-bottom: -1px;
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
          style: '${theme.styleUrl}',
          center: [${bootRegionRef.current.longitude}, ${bootRegionRef.current.latitude}],
          zoom: ${zoom},
          interactive: ${interactive}
      });
      
      map.on('moveend', () => {
        const center = map.getCenter();
        window.parent.postMessage(JSON.stringify({ type: 'regionChange', latitude: center.lat, longitude: center.lng }), '*');
      });
      let targetCenter = null;
      let targetZoom = null;

      window.currentMarkers = window.currentMarkers || {};
      // Markers are never baked into srcDoc: that would remount the iframe on
      // every \`partner_location_updated\` ping. The effect above pushes them
      // through the \`renderMarkers\` message, which parks them in
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
      
      window.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'flyTo') {
            if (map.isStyleLoaded()) {
              map.flyTo({ center: [data.longitude, data.latitude], zoom: data.zoom, speed: 1.2 });
            } else {
              targetCenter = [data.longitude, data.latitude];
              targetZoom = data.zoom;
            }
          }
          if (data.type === 'renderMarkers') {
            window.renderMarkers(data.markers);
          }
        } catch(e) {}
      });

      ${routeJs}
      </script>
      </body>
      </html>
    `;
  }, [interactive, routeKey, showUserLocation, theme]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleMessage = (event: MessageEvent) => {
        try {
          if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            if (data.type === 'regionChange' && onRegionChange) {
              onRegionChange({ latitude: data.latitude, longitude: data.longitude });
            }
          }
        } catch (e) { }
      };

      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [onRegionChange]);

  return (
    <View style={[styles.container, { backgroundColor: theme.base }, style]}>
      <iframe
        ref={iframeRef}
        onLoad={() => {
          isIframeReady.current = true;
          if (iframeRef.current && iframeRef.current.contentWindow && pendingMessages.current.length > 0) {
            pendingMessages.current.forEach(msg => {
              iframeRef.current!.contentWindow!.postMessage(JSON.stringify(msg), '*');
            });
            pendingMessages.current = [];
          }
        }}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        srcDoc={htmlContent}
        style={{
          border: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: interactive ? 'auto' : 'none'
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
