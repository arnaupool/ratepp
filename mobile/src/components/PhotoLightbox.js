import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder, Dimensions, Easing } from 'react-native';

const MAX_SCALE = 5;
const DOUBLE_TAP_MS = 280;

// Full-screen photo viewer with pinch-to-zoom, pan-when-zoomed, and
// double-tap to toggle zoom — implemented on plain PanResponder (no
// gesture-handler/reanimated dependency) since it's the only place in the
// app that needs multi-touch gestures.
export default function PhotoLightbox({ visible, uri, onClose }) {
  const { width, height } = Dimensions.get('window');
  const [mounted, setMounted] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0.92)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const lastScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });
  const lastDistance = useRef(null);
  const lastTapAt = useRef(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.setValue(0);
      entrance.setValue(0.92);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(entrance, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      lastScale.current = 1;
      lastTranslate.current = { x: 0, y: 0 };
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const resetZoom = () => {
    lastScale.current = 1;
    lastTranslate.current = { x: 0, y: 0 };
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const zoomTo = (factor) => {
    lastScale.current = factor;
    Animated.spring(scale, { toValue: factor, useNativeDriver: true }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) =>
        evt.nativeEvent.touches.length === 2 || Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const [a, b] = touches;
          const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          if (lastDistance.current == null) {
            // just transitioned to two fingers — record the baseline now,
            // don't wait for onPanResponderGrant (which only fires once,
            // typically on the very first finger before the second lands)
            lastDistance.current = dist;
          } else {
            const next = Math.min(Math.max((lastScale.current * dist) / lastDistance.current, 1), MAX_SCALE);
            scale.setValue(next);
          }
        } else {
          lastDistance.current = null;
          if (lastScale.current > 1) {
            translateX.setValue(lastTranslate.current.x + gestureState.dx);
            translateY.setValue(lastTranslate.current.y + gestureState.dy);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (lastDistance.current != null) {
          lastDistance.current = null;
          scale.stopAnimation((v) => {
            lastScale.current = Math.max(1, Math.min(v, MAX_SCALE));
            scale.setValue(lastScale.current);
            if (lastScale.current === 1) resetZoom();
          });
          return;
        }
        if (lastScale.current > 1) {
          lastTranslate.current = {
            x: lastTranslate.current.x + gestureState.dx,
            y: lastTranslate.current.y + gestureState.dy,
          };
          return;
        }
        if (Math.abs(gestureState.dx) < 4 && Math.abs(gestureState.dy) < 4) {
          const now = Date.now();
          if (now - lastTapAt.current < DOUBLE_TAP_MS) {
            zoomTo(2.5);
            lastTapAt.current = 0;
          } else {
            lastTapAt.current = now;
          }
        }
      },
    })
  ).current;

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Cerrar foto">
        <Text style={styles.closeBtnText}>✕</Text>
      </Pressable>
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <Animated.Image
          source={{ uri }}
          resizeMode="contain"
          style={[
            styles.image,
            { width, height, transform: [{ translateX }, { translateY }, { scale: Animated.multiply(scale, entrance) }] },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 100 },
  image: { position: 'absolute', top: 0, left: 0 },
  closeBtn: {
    position: 'absolute',
    top: 44,
    right: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 101,
  },
  closeBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});
