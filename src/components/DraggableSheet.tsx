import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_POINTS = [SCREEN_HEIGHT * 0.15, SCREEN_HEIGHT * 0.45, SCREEN_HEIGHT * 0.85];
const MIN_Y = SCREEN_HEIGHT - SNAP_POINTS[2];
const MID_Y = SCREEN_HEIGHT - SNAP_POINTS[1];
const MAX_Y = SCREEN_HEIGHT - SNAP_POINTS[0];

interface DraggableSheetProps {
  children: ReactNode;
}

export default function DraggableSheet({ children }: DraggableSheetProps) {
  const { colors } = useTheme();
  const sheetStyles = useMemo(() => createStyles(colors), [colors]);
  const translateY = useSharedValue(MID_Y);
  const startY = useSharedValue(MID_Y);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(MIN_Y, Math.min(MAX_Y, startY.value + event.translationY));
    })
    .onEnd((event) => {
      const snapPoints = [MIN_Y, MID_Y, MAX_Y];
      const targetY = translateY.value + event.velocityY * 0.2;

      let closestSnapPoint = snapPoints[0];
      let minDiff = Math.abs(targetY - snapPoints[0]);

      for (let i = 1; i < snapPoints.length; i++) {
        const diff = Math.abs(targetY - snapPoints[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closestSnapPoint = snapPoints[i];
        }
      }

      translateY.value = withSpring(closestSnapPoint, {
        velocity: event.velocityY,
        damping: 20,
        stiffness: 150,
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[sheetStyles.bottomSheet, animatedStyle]}>
        <View style={sheetStyles.dragHandleContainer}>
          <View style={sheetStyles.dragHandle} />
        </View>
        <View style={sheetStyles.content}>
          {children}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 35,
    elevation: 20,
    zIndex: 10,
  },
  dragHandleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    opacity: 0.6,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.marginMobile,
  },
});