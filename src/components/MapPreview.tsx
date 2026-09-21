import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

const MAP_VARIANTS = {
  home: {
    markers: [
      { left: '25%', top: '27%', image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Auto%20rickshaw/3D/auto_rickshaw_3d.png', label: '2 min' },
      { left: '73%', top: '62%', image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Auto%20rickshaw/3D/auto_rickshaw_3d.png', label: '3 min' },
      { left: '62%', top: '28%', image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Automobile/3D/automobile_3d.png', label: '5 min', tone: 'green' },
    ],
  },
  ride: {
    origin: { left: '12%', top: '78%', label: 'Anna Salai' },
    destination: { left: '89%', top: '18%', label: 'Marina Beach', tone: 'red' },
  },
  active: {
    origin: { left: '12%', top: '78%', label: 'Pickup' },
    marker: { left: '47%', top: '49%', image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Auto%20rickshaw/3D/auto_rickshaw_3d.png', label: 'TN 09 BK 4829' },
  },
  assigned: {
    origin: { left: '14%', top: '79%', label: 'Pickup' },
    marker: { left: '68%', top: '32%', image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Motor%20scooter/3D/motor_scooter_3d.png', label: 'TN 07 BV 4120' },
  },
  transit: {
    destination: { left: '90%', top: '19%', label: 'Home', tone: 'red' },
    marker: { left: '56%', top: '42%', image: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Motor%20scooter/3D/motor_scooter_3d.png', label: 'Crossing Adyar Bridge' },
  },
};

const Pin = ({ left, top, label, tone = 'blue' }: any) => (
  <View style={[styles.pinWrapper, { left, top }]}>
    <View style={[styles.pinDot, tone === 'red' ? styles.pinRed : styles.pinBlue]}>
      <View style={styles.pinInner} />
    </View>
    {label && <View style={styles.pinLabel}><Text style={styles.pinLabelText}>{label}</Text></View>}
  </View>
);

const VehicleMarker = ({ left, top, image, label, tone = 'blue' }: any) => (
  <View style={[styles.markerWrapper, { left, top }]}>
    <View style={[styles.markerBg, tone === 'green' ? styles.markerGreen : styles.markerBlue]}>
      <Image source={{ uri: image }} style={styles.markerImage} />
    </View>
    {label && <View style={styles.markerLabel}><Text style={styles.markerLabelText}>{label}</Text></View>}
  </View>
);

export default function MapPreview({ variant = 'home', style, onPress }: any) {
  const map = (MAP_VARIANTS[variant as keyof typeof MAP_VARIANTS] as any) || MAP_VARIANTS.home;

  const content = (
    <View style={[styles.container, style]}>
      {/* Fake Map Background */}
      <View style={styles.mapBg}>
        <View style={styles.park1} />
        <View style={styles.park2} />
        <View style={styles.water} />
      </View>
      
      {/* Locations Text */}
      <Text style={[styles.mapLabel, { left: '8%', top: '48%' }]}>T. NAGAR</Text>
      <Text style={[styles.mapLabel, { left: '52%', top: '19%' }]}>MYLAPORE</Text>
      <Text style={[styles.mapLabel, { left: '63%', top: '78%' }]}>ADYAR</Text>

      {/* Pins and Markers */}
      {map.origin && <Pin {...map.origin} />}
      {map.destination && <Pin {...map.destination} />}
      {map.marker && <VehicleMarker {...map.marker} />}
      {map.markers && map.markers.map((marker: any, idx: number) => <VehicleMarker key={idx} {...marker} />)}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.9}>{content}</TouchableOpacity>;
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    height: 150,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#dce8e8',
    borderColor: '#cbd6e8',
    borderWidth: 1,
    position: 'relative',
  },
  mapBg: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: '#dce8e8',
  },
  water: {
    position: 'absolute',
    right: '-12%',
    top: '-12%',
    height: '75%',
    width: '42%',
    backgroundColor: 'rgba(184, 217, 231, 0.8)',
    transform: [{ rotate: '18deg' }],
  },
  park1: {
    position: 'absolute',
    left: '8%',
    top: '13%',
    height: '23%',
    width: '19%',
    borderRadius: 50,
    backgroundColor: 'rgba(197, 223, 193, 0.8)',
  },
  park2: {
    position: 'absolute',
    left: '51%',
    top: '63%',
    height: '20%',
    width: '18%',
    borderRadius: 50,
    backgroundColor: 'rgba(197, 223, 193, 0.7)',
  },
  mapLabel: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: 'bold',
    color: 'rgba(102, 128, 132, 0.8)',
    letterSpacing: 1,
  },
  pinWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 0,
    height: 0,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinRed: { backgroundColor: '#C52A2E' },
  pinBlue: { backgroundColor: '#0033b1' },
  pinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  pinLabel: {
    position: 'absolute',
    top: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pinLabelText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1c1b1b',
  },
  markerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 0,
    height: 0,
    zIndex: 20,
  },
  markerBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerGreen: { backgroundColor: '#059669' },
  markerBlue: { backgroundColor: '#00217c' },
  markerImage: {
    width: 24,
    height: 24,
  },
  markerLabel: {
    position: 'absolute',
    top: 20,
    backgroundColor: 'rgba(24, 32, 47, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  markerLabelText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
