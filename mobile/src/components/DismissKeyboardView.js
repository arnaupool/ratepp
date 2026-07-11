import React, { Fragment } from 'react';
import { View, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';

// Wraps a screen's content so tapping empty space (anything that isn't a
// text input) closes the keyboard. TouchableWithoutFeedback's native touch
// responder negotiation correctly lets a nested TextInput handle its own
// tap first — this only works right on native (iOS/Android), which is the
// app's real target platform.
//
// react-native-web has no such responder negotiation (it emulates touches
// with plain DOM click bubbling), so a tap landing directly on a nested
// TextInput would incorrectly bubble up to this wrapper too. Patching that
// on web (checking the click target, even just an inert extra wrapping
// View with zero listeners) reliably broke focus tracking for fast/
// sequential typing in headless Chromium, for reasons that don't trace back
// to any dismiss logic actually firing — it reproduced merely from the
// extra DOM node's presence. Since the web build is only used for local
// preview/e2e here, not a real target, we render children directly (no
// wrapper at all) there rather than risk that regression.
export default function DismissKeyboardView({ children, style }) {
  if (Platform.OS === 'web') {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={style}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
