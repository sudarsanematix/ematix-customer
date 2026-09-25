import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export const CHENNAI_REGION: MapRegion = {
  latitude: 13.0316,
  longitude: 80.2341,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

interface RealMapProps {
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  interactive?: boolean;
  children?: React.ReactNode;
}

export default function RealMap({ style, region = CHENNAI_REGION, interactive = false, children }: RealMapProps) {
  // Calculate bounding box for OpenStreetMap iframe
  const minLon = region.longitude - region.longitudeDelta;
  const minLat = region.latitude - region.latitudeDelta;
  const maxLon = region.longitude + region.longitudeDelta;
  const maxLat = region.latitude + region.latitudeDelta;
  
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon},${minLat},${maxLon},${maxLat}&layer=mapnik&marker=${region.latitude},${region.longitude}`;

  return (
    <View style={[styles.container, style]}>
      <WebView 
        source={{ uri: mapUrl }} 
        style={StyleSheet.absoluteFill}
        scrollEnabled={interactive}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        pointerEvents={interactive ? 'auto' : 'none'}
      />
      <View style={styles.webTint} pointerEvents="none" />
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
  },
  webTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,33,124,0.12)',
  },
});
