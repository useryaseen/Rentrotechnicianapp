/**
 * Capture / Gallery photo picker with compression and size badges (spec §9.4, §12).
 */
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, fonts } from '@/theme';
import { compressImage } from '@/lib/imageUtils';
import { formatBytes } from '@/lib/format';

export type LocalImage = {
  uri: string;
  name: string;
  type: string;
  originalSize: number;
  compressedSize: number;
};

function permissionDenied(what: string) {
  Alert.alert(
    `${what} permission needed`,
    `Allow ${what.toLowerCase()} access in Settings to attach service photos.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}

export default function PhotoPicker({
  images,
  onChange,
  prefix,
  disabled,
}: {
  images: LocalImage[];
  onChange: (images: LocalImage[]) => void;
  /** File name prefix: `before` → before-1.jpg, before-2.jpg … */
  prefix: string;
  disabled?: boolean;
}) {
  const [processing, setProcessing] = useState(false);

  const addAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setProcessing(true);
    try {
      const next = [...images];
      for (const asset of assets) {
        next.push(await compressImage(asset, `${prefix}-${next.length + 1}.jpg`));
      }
      // Keep the names sequential after removals.
      onChange(next.map((img, i) => ({ ...img, name: `${prefix}-${i + 1}.jpg` })));
    } finally {
      setProcessing(false);
    }
  };

  const capture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      permissionDenied('Camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets?.length) await addAssets(result.assets);
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      permissionDenied('Photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets?.length) await addAssets(result.assets);
  };

  const remove = (index: number) => {
    onChange(
      images
        .filter((_, i) => i !== index)
        .map((img, i) => ({ ...img, name: `${prefix}-${i + 1}.jpg` }))
    );
  };

  const busy = disabled || processing;

  return (
    <View style={styles.wrap}>
      <View style={styles.buttons}>
        <Pressable
          onPress={capture}
          disabled={busy}
          style={({ pressed }) => [styles.pickBtn, pressed && styles.pressed, busy && styles.disabled]}
        >
          <Feather name="camera" size={18} color={colors.primary} />
          <Text style={styles.pickText}>Capture</Text>
        </Pressable>
        <Pressable
          onPress={pickFromGallery}
          disabled={busy}
          style={({ pressed }) => [styles.pickBtn, pressed && styles.pressed, busy && styles.disabled]}
        >
          <Feather name="image" size={18} color={colors.primary} />
          <Text style={styles.pickText}>Gallery</Text>
        </Pressable>
      </View>

      {processing ? (
        <View style={styles.processing}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.processingText}>Compressing photos…</Text>
        </View>
      ) : null}

      {images.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {images.map((img, index) => (
            <View key={`${img.uri}-${index}`} style={styles.thumb}>
              <Image source={{ uri: img.uri }} style={styles.thumbImage} />
              <Pressable
                onPress={() => remove(index)}
                hitSlop={8}
                style={styles.remove}
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <Feather name="x" size={14} color={colors.surface} />
              </Pressable>
              <View style={styles.sizeBadge}>
                <Text style={styles.sizeText} numberOfLines={1}>
                  {formatBytes(img.originalSize)} → {formatBytes(img.compressedSize)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pickText: {
    fontFamily: fonts.semibold,
    color: colors.primary,
    fontSize: fontSize.sm + 1,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  processing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  processingText: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  thumbs: {
    gap: spacing.sm,
  },
  thumb: {
    width: 108,
    height: 108,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.slateSoft,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBadge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 3,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  sizeText: {
    fontFamily: fonts.medium,
    color: colors.surface,
    fontSize: 10,
    textAlign: 'center',
  },
});
