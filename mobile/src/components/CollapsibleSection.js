import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import { animateNext } from '../utils/animate';

// A section hidden behind a tap by default — used for the card color
// picker, which doesn't need to compete for attention with the fields most
// people fill in every time.
export default function CollapsibleSection({ title, children, defaultOpen = false, subColor }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const sub = subColor || colors.sub;

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.header}
        onPress={() => {
          animateNext();
          setOpen((v) => !v);
        }}
        accessibilityLabel={`${open ? 'Ocultar' : 'Mostrar'} ${title}`}
      >
        <Text style={[type.scoreLabel, { color: sub }]}>{title}</Text>
        <Text style={{ fontSize: 12, color: sub }}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open && <View style={{ marginTop: 8 }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
