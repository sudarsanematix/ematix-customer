import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

export type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

interface MaterialIconProps {
  name: MaterialIconName;
  size?: number;
  color?: ComponentProps<typeof MaterialIcons>['color'];
}

/**
 * Material icon glyph used app-wide to match the "Material Symbols" look of the mockups.
 */
export default function MaterialIcon({ name, size = 20, color = '#1c1b1b' }: MaterialIconProps) {
  return <MaterialIcons name={name} size={size} color={color} />;
}