import * as ImagePicker from 'expo-image-picker';

export async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Necesitamos acceso a tus fotos para continuar');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}
