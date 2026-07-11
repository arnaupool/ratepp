import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';

const MAX_SCALE = 5;
const DOUBLE_TAP_MS = 280;

// Full-screen photo viewer with pinch-to-zoom, pan-when-zoomed, and
// double-tap to toggle zoom — implemented on plain PanResponder (no
// gesture-handler/reanimated dependency) since it's the only place in the
// app that needs multi-touch gestures.
export default function PhotoLightbox({ visible, uri, onClose }) {
  const { width, height } = Dimensions.get('window');
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const lastScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });
  const lastDistance = useRef(null);
  const lastTapAt = useRef(0);

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
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          const [a, b] = evt.nativeEvent.touches;
          lastDistance.current = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const [a, b] = touches;
          const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          if (lastDistance.current) {
            const next = Math.min(Math.max((lastScale.current * dist) / lastDistance.current, 1), MAX_SCALE);
            scale.setValue(next);
          }
        } else if (lastScale.current > 1) {
          translateX.setValue(lastTranslate.current.x + gestureState.dx);
          translateY.setValue(lastTranslate.current.y + gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (lastDistance.current) {
          scale.stopAnimation((v) => {
            lastScale.current = Math.max(1, Math.min(v, MAX_SCALE));
            scale.setValue(lastScale.current);
            if (lastScale.current === 1) resetZoom();
          });
          lastDistance.current = null;
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

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Cerrar foto">
        <Text style={styles.closeBtnText}>✕</Text>
      </Pressable>
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <Animated.Image
          source={{ uri }}
          resizeMode="contain"
          style={[styles.image, { width, height, transform: [{ translateX }, { translateY }, { scale }] }]}
        />
      </View>
    </View>
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 101,
  },
  closeBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});
