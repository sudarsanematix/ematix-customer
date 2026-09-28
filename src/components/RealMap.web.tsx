import React, { useMemo } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';

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
};

export const CHENNAI_REGION: MapRegion = {
  latitude: 13.0316,
  longitude: 80.2341,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

interface RealMapProps {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][]; // [longitude, latitude][]
  showUserLocation?: boolean;
  children?: React.ReactNode;
}

export default function RealMap({ style, region = CHENNAI_REGION, interactive = false, markers = [], routeCoordinates = [], showUserLocation = false, children }: RealMapProps) {
  
  const htmlContent = useMemo(() => {
    // Generate Markers JS
    const markersJs = markers.map(marker => `
      new mapboxgl.Marker({ color: '${marker.color || '#000000'}' })
        .setLngLat([${marker.longitude}, ${marker.latitude}])
        .addTo(map);
    `).join('\n');

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
              'line-color': '#00217C',
              'line-width': 4
            }
          });
        });
      `;
    }

    const geolocateJs = '';

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
      body { margin: 0; padding: 0; }
      #map { position: absolute; top: 0; bottom: 0; width: 100%; }
      </style>
      </head>
      <body>
      <div id="map"></div>
      <script>
      mapboxgl.accessToken = '${MAPBOX_TOKEN}';
      const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/navigation-day-v1',
          center: [${region.longitude}, ${region.latitude}],
          zoom: ${zoom},
          interactive: ${interactive}
      });
      ${markersJs}
      ${routeJs}
      ${geolocateJs}
      </script>
      </body>
      </html>
    `;
  }, [region, interactive, markers, routeCoordinates, showUserLocation]);

  return (
    <View style={[styles.container, style]}>
      <iframe
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
    backgroundColor: '#e8ecef',
  }
});
