import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Platform } from 'react-native';

let MapView: any = null;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default || maps;
  } catch (e) {
    console.warn('react-native-maps not available', e);
  }
}

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
  return (
    <View style={[styles.container, style]}>
      {MapView ? (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          rotateEnabled={interactive}
          pitchEnabled={false}
          showsCompass={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#e8ecef' }]} />
      )}
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
});
