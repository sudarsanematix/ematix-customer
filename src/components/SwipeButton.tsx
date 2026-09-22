import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import MaterialIcon from './MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, radius, type } from '../theme/typography';

interface SwipeButtonProps {
  onSwipeComplete: () => void;
  title?: string;
}

export default function SwipeButton({ onSwipeComplete, title = 'Slide To Send Request' }: SwipeButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [containerWidth, setContainerWidth] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const thumbWidth = 56;
  const padding = 6;
  const trackWidth = containerWidth - padding * 2;
  const maxTravel = Math.max(0, trackWidth - thumbWidth);

  const [isCompleted, setIsCompleted] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isCompleted,
      onMoveShouldSetPanResponder: () => !isCompleted,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        
        // If swiped more than 80% of the track, complete it
        if (gestureState.dx > maxTravel * 0.8) {
          setIsCompleted(true);
          Animated.spring(pan, {
            toValue: { x: maxTravel, y: 0 },
            useNativeDriver: false,
            bounciness: 0,
          }).start(() => {
            onSwipeComplete();
          });
        } else {
          // Snap back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            bounciness: 10,
          }).start();
        }
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const clampedX = pan.x.interpolate({
    inputRange: [0, maxTravel],
    outputRange: [0, maxTravel],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Text style={styles.titleText}>{title}</Text>
      {containerWidth > 0 && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.thumb, { transform: [{ translateX: clampedX }] }]}
        >
          <MaterialIcon name="arrow-forward" size={24} color={colors.onPrimary} />
        </Animated.View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    width: '100%',
    height: 64,
    backgroundColor: colors.surfaceContainerHighest || '#00215E',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  titleText: {
    ...type.labelLg,
    color: '#F4B000', // Yellowish color matching the mockup text "Slide To Send Request"
    fontFamily: fonts.bold,
  },
  thumb: {
    position: 'absolute',
    left: 6,
    width: 56,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F4B000', // Yellow thumb
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
