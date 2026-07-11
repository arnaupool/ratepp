import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { api } from '../api/client';
import { pickImage } from '../utils/pickImage';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import CoverPickerOverlay from './CoverPickerOverlay';
import { animateNext } from '../utils/animate';

// Shared photo-gallery manager for a score: an ordered list of URLs where
// the first one is always the cover. Used by both Create (fresh score) and
// Detail (editing an existing one) — the parent owns the array and just
// gets it back via onChange after every add/remove/reorder.
export default function PhotoGalleryEditor({ photos, onChange, onError }) {
  const [uploading, setUploading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const addUrl = (url) => {
    animateNext();
    onChange([...photos, url]);
  };

  const uploadFromDevice = async () => {
    try {
      const uri = await pickImage();
      if (!uri) return;
      setUploading(true);
      const url = await api.uploadPhoto(uri);
      addUrl(url);
    } catch (e) {
      onError?.(e.message || 'No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const openSearch = () => {
    Keyboard.dismiss();
    animateNext();
    setSearchOpen(true);
  };

  const remove = (idx) => {
    animateNext();
    onChange(photos.filter((_, i) => i !== idx));
  };

  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    animateNext();
    const next = photos.slice();
    [next[target], next[idx]] = [next[idx], next[target]];
    onChange(next);
  };

  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {photos.map((url, idx) => (
            <View key={`${url}-${idx}`} style={styles.thumbWrap}>
              <Image source={{ uri: url }} style={styles.thumb} />
              {idx === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>PORTADA</Text>
                </View>
              )}
              <Pressable style={styles.removeBtn} onPress={() => remove(idx)} accessibilityLabel="Quitar foto">
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
              <View style={styles.moveRow}>
                <Pressable
                  disabled={idx === 0}
                  onPress={() => move(idx, -1)}
                  style={[styles.moveBtn, idx === 0 && styles.moveBtnDisabled]}
                  accessibilityLabel="Mover foto a la izquierda"
                >
                  <Text style={styles.moveBtnText}>‹</Text>
                </Pressable>
                <Pressable
                  disabled={idx === photos.length - 1}
                  onPress={() => move(idx, 1)}
                  style={[styles.moveBtn, idx === photos.length - 1 && styles.moveBtnDisabled]}
                  accessibilityLabel="Mover foto a la derecha"
                >
                  <Text style={styles.moveBtnText}>›</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable style={styles.addTile} onPress={uploadFromDevice} accessibilityLabel="Añadir foto a la galería">
            {uploading ? <ActivityIndicator color={colors.sub} /> : <Text style={styles.addTilePlus}>+</Text>}
          </Pressable>
        </View>
      </ScrollView>
      <Pressable style={styles.searchBtn} onPress={openSearch}>
        <Text style={[type.quickChip, { color: colors.ink }]}>Buscar carátula</Text>
      </Pressable>
      <CoverPickerOverlay
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onConfirm={(url) => {
          addUrl(url);
          setSearchOpen(false);
        }}
      />
    </View>
  );
}

const THUMB = 84;

const styles = StyleSheet.create({
  thumbWrap: { width: THUMB, gap: 4 },
  thumb: { width: THUMB, height: THUMB, borderRadius: 12, backgroundColor: colors.surface },
  coverBadge: {
    position: 'absolute',
    left: 4,
    top: 4,
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  coverBadgeText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 8, color: colors.white, letterSpacing: 0.3 },
  removeBtn: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 9, fontWeight: '700', color: colors.white, lineHeight: 10 },
  moveRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moveBtn: {
    width: 26,
    height: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  moveBtnDisabled: { opacity: 0.35 },
  moveBtnText: { fontSize: 13, fontWeight: '800', color: colors.sub, lineHeight: 14 },
  addTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTilePlus: { fontSize: 22, fontWeight: '800', color: colors.sub, lineHeight: 24, marginTop: -1 },
  searchBtn: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
