import React, { useEffect, useMemo } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MarkerView } from '@rnmapbox/maps';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { MapThemeTokens } from '../../theme/mapTheme';
import { markerImageFor, markerImageKeyFor } from '../markerImages';
import { vehicleColor, type LiveVehicleKind } from '../liveMapTypes';
import type { NativeMapMarker } from './mapTypes';

type Props = {
  markers: NativeMapMarker[];
  theme: MapThemeTokens;
};

const DEFAULT_BEACON_COLOR = '#0052FF';

const ANCHORS: Record<string, { x: number; y: number }> = {
  beacon: { x: 0.5, y: 1 },
  title: { x: 0.5, y: 1 },
  vehicle: { x: 0.5, y: 0.5 },
  pin: { x: 0.5, y: 0.5 },
  pulse: { x: 0.5, y: 0.5 },
};

/** Shared elevation so markers read against any basemap. */
function shadowStyle(theme: MapThemeTokens) {
  return {
    shadowColor: theme.shadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  } as const;
}

function BeaconMarker({ color, label }: { color: string; label: string }) {
  const lift = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(lift, { toValue: 1, duration: 1250, useNativeDriver: false }),
        Animated.timing(lift, { toValue: 0, duration: 1250, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [lift]);

  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <Animated.View style={[styles.beacon, { transform: [{ translateY }] }]}>
      <View style={[styles.beaconLabel, { backgroundColor: color }]}>
        <Text style={styles.beaconLabelText} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={[styles.beaconStem, { backgroundColor: color }]} />
      <View style={[styles.beaconBase, { backgroundColor: color }]}>
        <View style={[styles.beaconHalo, { backgroundColor: color }]} />
        <View style={styles.beaconCore} />
      </View>
    </Animated.View>
  );
}

function PulseRing({
  color,
  size = 22,
  maxScale = 1.9,
}: {
  color: string;
  size?: number;
  maxScale?: number;
}) {
  const ring = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1900, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [ring]);

  const scale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, maxScale] });
  const opacity = ring.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.32, 0, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function DotMarker({
  color,
  theme,
  onPress,
}: {
  color: string;
  theme: MapThemeTokens;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.pinWrap} hitSlop={8}>
      <PulseRing color={color} />
      <View
        style={[
          styles.dot,
          shadowStyle(theme),
          { backgroundColor: color, borderColor: theme.onBase },
        ]}
      />
    </Pressable>
  );
}

function EndMarker({
  color,
  theme,
  onPress,
}: {
  color: string;
  theme: MapThemeTokens;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.endWrap} hitSlop={8}>
      <View
        style={[
          styles.endBody,
          shadowStyle(theme),
          { backgroundColor: color, borderColor: theme.onBase },
        ]}
      >
        <View style={styles.endCore} />
      </View>
    </Pressable>
  );
}

function TitleMarker({
  title,
  color,
  theme,
  onPress,
}: {
  title: string;
  color: string;
  theme: MapThemeTokens;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.titleWrap} hitSlop={8}>
      <View style={[styles.titleLabel, shadowStyle(theme), { backgroundColor: color }]}>
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={[styles.titlePin, { backgroundColor: color }]} />
    </Pressable>
  );
}

/** Large pulsing dot used while locating a driver (RealMap `pulseMarker`). */
function PulseMarker({
  color,
  theme,
  onPress,
}: {
  color: string;
  theme: MapThemeTokens;
  onPress?: () => void;
}) {
  return (
    <View style={styles.pulseWrap}>
      <PulseRing color={theme.brandTint} size={32} maxScale={5} />
      <Pressable onPress={onPress} hitSlop={8}>
        <View style={[styles.pulseDot, shadowStyle(theme), { backgroundColor: color }]}>
          <View style={[styles.pulseCore, { backgroundColor: theme.onBase }]} />
        </View>
      </Pressable>
    </View>
  );
}

/** Colored disc + vehicle glyph, carried over from the LiveMap WebView bridge. */
function VehicleBadgeMarker({
  vehicleType,
  bearing,
  theme,
  onPress,
}: {
  vehicleType?: string;
  bearing?: number;
  theme: MapThemeTokens;
  onPress?: () => void;
}) {
  const kind = markerImageKeyFor(vehicleType) as LiveVehicleKind;
  const color = vehicleColor(kind, theme.isDark);
  const onBase = theme.onBase;

  return (
    <Pressable onPress={onPress} style={styles.vehicleWrap} hitSlop={8}>
      <View
        style={[
          styles.vehicleBadge,
          shadowStyle(theme),
          {
            backgroundColor: color,
            borderColor: onBase,
            transform: [{ rotate: `${bearing ?? 0}deg` }],
          },
        ]}
      >
        {kind === 'auto' ? (
          <Svg viewBox="0 0 24 24" width={17} height={17} aria-hidden>
            <Rect x={6} y={2} width={12} height={20} rx={3} fill={onBase} />
            <Rect x={7} y={4} width={10} height={4} fill="#000" opacity={0.4} rx={1} />
            <Rect x={6} y={11} width={12} height={11} rx={1} fill={onBase} />
            <Path d="M5 14L5 18L19 18L19 14Z" fill="#000" opacity={0.2} />
          </Svg>
        ) : kind === 'bike' ? (
          <Svg viewBox="0 0 24 24" width={17} height={17} aria-hidden>
            <Rect x={10} y={2} width={4} height={20} rx={2} fill={onBase} />
            <Circle cx={12} cy={14} r={4} fill={onBase} />
            <Rect x={7} y={7} width={10} height={2} rx={1} fill={onBase} />
          </Svg>
        ) : (
          <Svg viewBox="0 0 24 24" width={17} height={17} aria-hidden>
            <Rect x={6} y={2} width={12} height={20} rx={4} fill={onBase} />
            <Rect x={7} y={6} width={10} height={5} fill="#000" opacity={0.4} rx={1} />
            <Rect x={7} y={15} width={10} height={4} fill="#000" opacity={0.4} rx={1} />
          </Svg>
        )}
      </View>
    </Pressable>
  );
}

/** PNG sprite used by the booking screens (RealMap). */
function VehicleImageMarker({
  vehicleType,
  bearing,
  theme,
  onPress,
}: {
  vehicleType?: string;
  bearing?: number;
  theme: MapThemeTokens;
  onPress?: () => void;
}) {
  const source = markerImageFor(vehicleType);
  return (
    <Pressable onPress={onPress} style={styles.vehicleWrap} hitSlop={8}>
      <Image
        source={{ uri: source }}
        resizeMode="contain"
        style={[
          styles.vehicleImage,
          shadowStyle(theme),
          { transform: [{ rotate: `${bearing ?? 0}deg` }] },
        ]}
      />
    </Pressable>
  );
}

function renderMarker(marker: NativeMapMarker, theme: MapThemeTokens) {
  switch (marker.kind) {
    case 'beacon': {
      const isWhite =
        marker.color &&
        (marker.color.toLowerCase() === '#ffffff' ||
          marker.color.toLowerCase() === '#fff' ||
          marker.color.toLowerCase() === 'white' ||
          marker.color.toLowerCase() === 'rgb(255, 255, 255)' ||
          marker.color.toLowerCase() === 'rgba(255, 255, 255, 1)');
      return (
        <BeaconMarker
          color={!marker.color || isWhite ? DEFAULT_BEACON_COLOR : marker.color}
          label={marker.label ?? 'You are here'}
        />
      );
    }
    case 'vehicle':
      return marker.vehicleStyle === 'badge' ? (
        <VehicleBadgeMarker
          vehicleType={marker.vehicleType}
          bearing={marker.bearing}
          theme={theme}
          onPress={marker.onPress}
        />
      ) : (
        <VehicleImageMarker
          vehicleType={marker.vehicleType}
          bearing={marker.bearing}
          theme={theme}
          onPress={marker.onPress}
        />
      );
    case 'title':
      return (
        <TitleMarker
          title={marker.title ?? ''}
          color={marker.color ?? '#333'}
          theme={theme}
          onPress={marker.onPress}
        />
      );
    case 'pulse':
      return (
        <PulseMarker
          color={marker.color ?? theme.routeDone}
          theme={theme}
          onPress={marker.onPress}
        />
      );
    default:
      return marker.variant === 'end' ? (
        <EndMarker
          color={marker.color ?? theme.routeDone}
          theme={theme}
          onPress={marker.onPress}
        />
      ) : (
        <DotMarker
          color={marker.color ?? theme.routeDone}
          theme={theme}
          onPress={marker.onPress}
        />
      );
  }
}

export default function NativeMapMarkers({ markers, theme }: Props) {
  return (
    <>
      {markers.map((marker) => {
        const anchor =
          marker.kind === 'pin' && marker.variant === 'end'
            ? { x: 0.5, y: 1 }
            : ANCHORS[marker.kind ?? 'pin'];
        return (
          <MarkerView
            key={marker.id}
            coordinate={marker.lngLat}
            anchor={anchor}
            allowOverlap
          >
            {renderMarker(marker, theme)}
          </MarkerView>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  beacon: {
    alignItems: 'center',
  },
  beaconLabel: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2,
    maxWidth: 140,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  beaconLabelText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  beaconStem: {
    width: 2.5,
    height: 18,
    borderRadius: 1,
  },
  beaconBase: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  beaconHalo: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    opacity: 0.35,
  },
  beaconCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  pinWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  pulseWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 3,
  },
  endWrap: {
    width: 30,
    height: 36,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  endBody: {
    width: 17,
    height: 17,
    marginTop: 2,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
    borderBottomLeftRadius: 0,
    borderWidth: 2,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  titleWrap: {
    alignItems: 'center',
  },
  titleLabel: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 2,
    maxWidth: 180,
  },
  titleText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  titlePin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  vehicleWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleImage: {
    width: 48,
    height: 48,
  },
});
