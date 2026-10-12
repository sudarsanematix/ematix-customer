import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  children?: ReactNode;
};

/**
 * Overlay slot for screen-level controls (chips, FABs, cards) drawn above the
 * native map. Mapbox ornaments (compass/attribution) are configured on the
 * `MapView` itself; this component only forwards React overlays.
 */
export default function NativeMapControls({ children }: Props) {
  if (!children) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {children}
    </View>
  );
}
