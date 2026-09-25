import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcon from '../components/MaterialIcon';

export default function SplashScreen() {
  const router = useRouter();
  const [scaleAnim] = useState(() => new Animated.Value(0.9));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();

    // Navigate to login after 2.5 seconds
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [scaleAnim, opacityAnim]);

  return (
    <LinearGradient
      colors={['#00217c', '#000b29']}
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoWrap}>
          <View style={styles.logoInner}>
            <MaterialIcon name="bolt" size={56} color="#00217c" />
          </View>
          <View style={styles.glow} />
        </View>
        
        <Text style={styles.title}>EMATIX</Text>
        <Text style={styles.subtitle}>QUICK & SAFE DELIVERY</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoWrap: {
    position: 'relative',
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: 104,
    height: 104,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 1,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#809ffe',
    letterSpacing: 4,
  },
});
