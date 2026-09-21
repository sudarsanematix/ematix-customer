import React, { useEffect } from 'react';
import { StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  variant?: 'rectangular' | 'circular' | 'text';
}

export default function Skeleton({
  width,
  height,
  radius,
  style,
  variant = 'rectangular',
}: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  let defaultStyles: ViewStyle = {};
  
  if (variant === 'circular') {
    defaultStyles = {
      width: width || 40,
      height: height || 40,
      borderRadius: typeof width === 'number' ? width / 2 : 20,
    };
  } else if (variant === 'text') {
    defaultStyles = {
      width: width || '100%',
      height: height || 16,
      borderRadius: radius ?? 4,
    };
  } else {
    defaultStyles = {
      width: width || '100%',
      height: height || 100,
      borderRadius: radius ?? 12,
    };
  }

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.surfaceContainerHigh, overflow: 'hidden' },
        defaultStyles,
        style,
        animatedStyle,
      ]}
    />
  );
}
