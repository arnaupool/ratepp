import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Easing, Keyboard } from 'react-native';

// Shared bottom-sheet chrome (backdrop fade + slide-up) for every inline
// overlay in the app ("Más campos", cover search, location picker) — a
// plain conditional render has no transition, which reads as the sheet
// just teleporting in.
export default function AnimatedSheet({ visible, onClose, children }) {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(320)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
      setMounted(true);
      translateY.setValue(320);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 320, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    zIndex: 50,
  },
});
