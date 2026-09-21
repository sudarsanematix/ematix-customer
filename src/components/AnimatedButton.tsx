import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Animated } from 'react-native';

interface AnimatedButtonProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
}

export default function AnimatedButton({ 
  children, 
  style, 
  activeScale = 0.96, 
  onPressIn, 
  onPressOut, 
  ...rest 
}: AnimatedButtonProps) {
  const [scale] = React.useState(() => new Animated.Value(1));

  const handlePressIn = (e: any) => {
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
    if (onPressOut) onPressOut(e);
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
