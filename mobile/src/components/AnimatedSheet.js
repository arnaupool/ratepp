import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Easing, Keyboard, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';

// Shared bottom-sheet chrome (backdrop fade + slide-up) for every inline
// overlay in the app ("Más campos", cover search, location picker) — a
// plain conditional render has no transition, which reads as the sheet
// just teleporting in.
export default function AnimatedSheet({ visible, onClose, children }) {
  const [mounted, setMounted] = useState(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const translateY = useRef(new Animated.Value(320)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // KeyboardAvoidingView's "padding" mode shifts the whole sheet upward by
  // the keyboard's height without shrinking it — fine for short sheets, but
  // a tall one (like the cover-search results grid) just gets pushed off
  // the top of the screen, taking its search box with it. Tracking the
  // real keyboard height lets us cap the sheet's own height so it shrinks
  // to fit the space still visible above the keyboard instead.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates?.height || 0));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const availableHeight = keyboardHeight > 0 ? Dimensions.get('window').height - keyboardHeight - 40 : undefined;

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <KeyboardAvoidingView
        behavior="padding"
        style={{ width: '100%' }}
        pointerEvents="box-none"
      >
        <Animated.View style={{ transform: [{ translateY }], maxHeight: availableHeight }}>{children}</Animated.View>
      </KeyboardAvoidingView>
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
