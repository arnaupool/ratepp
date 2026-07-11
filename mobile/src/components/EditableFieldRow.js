import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import { FIELD_DEFS } from '../constants/fieldDefs';
import FieldIcon from './FieldIcon';
import DateField from './DateField';
import TagAutocomplete from './TagAutocomplete';
import MapPreview from './MapPreview';

// Shared editable field row for both Create (local-only state, saved on
// submit) and Detail's edit mode (each change is persisted). The parent
// decides what "persist" means:
//   - onValueChange: called on every change, for live local UI state
//   - onValueCommit: called when it's an appropriate moment to actually
//     save (immediately for date/location/tag/gallery; on blur for
//     free-typed text/list items, to avoid a PATCH per keystroke)
// Create can point both at the same local-state setter — persistence is a
// no-op there until the final "Guardar puntuación".
export default function EditableFieldRow({
  field,
  isFirst,
  isLast,
  onLabelChange,
  onLabelCommit,
  onValueChange,
  onValueCommit,
  onListItemChange,
  onAddListItem,
  onPickGalleryPhoto,
  onRemoveGalleryPhoto,
  onPickLocation,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  const { colors } = useTheme();
  const def = FIELD_DEFS.find((d) => d.id === field.type);
  if (!def) return null;

  return (
    <View style={[styles.fieldRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.fieldHead}>
        <View style={[styles.ficonWrap, { backgroundColor: colors.accent2 }]}>
          <FieldIcon type={def.icon} size={18} color={colors.white} />
        </View>
        <TextInput
          style={[type.fieldLabel, styles.fieldLabelInput, { color: colors.sub }]}
          value={field.label}
          onChangeText={onLabelChange}
          onBlur={() => onLabelCommit(field.label)}
        />
        <View style={styles.fieldActions}>
          <Pressable
            style={[styles.moveBtn, { backgroundColor: 'rgba(128,128,128,0.15)' }, isFirst && styles.moveBtnDisabled]}
            disabled={isFirst}
            onPress={onMoveUp}
            accessibilityLabel={`Mover ${field.label} arriba`}
          >
            <Text style={[styles.moveBtnText, { color: colors.sub }]}>▲</Text>
          </Pressable>
          <Pressable
            style={[styles.moveBtn, { backgroundColor: 'rgba(128,128,128,0.15)' }, isLast && styles.moveBtnDisabled]}
            disabled={isLast}
            onPress={onMoveDown}
            accessibilityLabel={`Mover ${field.label} abajo`}
          >
            <Text style={[styles.moveBtnText, { color: colors.sub }]}>▼</Text>
          </Pressable>
          <Pressable style={[styles.fieldRemove, { backgroundColor: 'rgba(128,128,128,0.15)' }]} onPress={onRemove} accessibilityLabel={`Quitar campo ${field.label}`}>
            <Text style={[styles.fieldRemoveText, { color: colors.sub }]}>✕</Text>
          </Pressable>
        </View>
      </View>

      {def.kind === 'simple' && (
        <TextInput
          style={[styles.fieldInput, { color: colors.ink }]}
          placeholder={def.placeholder}
          placeholderTextColor={colors.sub}
          value={field.value}
          onChangeText={onValueChange}
          onBlur={() => onValueCommit(field.value)}
          keyboardType={def.keyboardType || 'default'}
        />
      )}

      {def.kind === 'date' && (
        <DateField
          value={field.value}
          onChange={(v) => {
            onValueChange(v);
            onValueCommit(v);
          }}
        />
      )}

      {def.kind === 'tag' && (
        <TagAutocomplete
          value={field.value}
          onChange={(v) => {
            onValueChange(v);
            onValueCommit(v);
          }}
        />
      )}

      {def.kind === 'location' && (
        field.value ? (
          <Pressable onPress={onPickLocation}>
            <MapPreview value={field.value} height={120} />
          </Pressable>
        ) : (
          <Pressable style={[styles.locationBtn, { backgroundColor: colors.bg, borderColor: colors.line }]} onPress={onPickLocation}>
            <Text style={[type.quickChip, { color: colors.accent }]}>📍 Elegir ubicación en el mapa</Text>
          </Pressable>
        )
      )}

      {def.kind === 'list' && (
        <View style={{ gap: 8 }}>
          {field.value.map((v, idx) => (
            <TextInput
              key={idx}
              style={[styles.fieldInput, { color: colors.ink }]}
              placeholder="Añade un ítem..."
              placeholderTextColor={colors.sub}
              value={v}
              onChangeText={(text) => onListItemChange(idx, text)}
              onBlur={() => onValueCommit(field.value)}
            />
          ))}
          <Pressable onPress={onAddListItem}>
            <Text style={[type.listAdd, { color: colors.accent }]}>+ Añadir ítem</Text>
          </Pressable>
        </View>
      )}

      {def.kind === 'gallery' && (
        <View style={styles.phGrid}>
          {field.value.map((url, idx) => (
            <View key={idx} style={styles.phMiniGridItem}>
              <Image source={{ uri: url }} style={StyleSheet.absoluteFill} />
              <Pressable
                style={styles.galleryRemove}
                onPress={() => onRemoveGalleryPhoto(idx)}
                accessibilityLabel="Quitar foto"
              >
                <Text style={styles.galleryRemoveText}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable style={[styles.phMiniGridItem, styles.addPhotoTile, { borderColor: colors.line }]} onPress={onPickGalleryPhoto} accessibilityLabel="Añadir foto">
            {field.uploading ? <ActivityIndicator color={colors.sub} /> : <Text style={[styles.addPhotoPlus, { color: colors.sub }]}>+</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
  },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  ficonWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabelInput: { flex: 1, padding: 0 },
  fieldActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  moveBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnDisabled: { opacity: 0.3 },
  moveBtnText: { fontSize: 8 },
  fieldRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldRemoveText: { fontSize: 11, fontWeight: '700' },
  fieldInput: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
    padding: 0,
  },
  locationBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  phGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  phMiniGridItem: { width: '31.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden' },
  addPhotoTile: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoPlus: { fontSize: 20, fontWeight: '800', lineHeight: 22, marginTop: -1 },
  galleryRemove: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryRemoveText: { fontSize: 9, fontWeight: '700', color: '#fff' },
});
