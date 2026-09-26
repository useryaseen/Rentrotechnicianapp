/**
 * Signature input with two modes (spec §6.5, §9.4):
 *  - Draw: full-screen canvas → PNG `<label>-signature.png`
 *  - Photo: camera shot of a paper signature
 */
import React, { useRef, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureCanvas, { type SignatureViewRef } from 'react-native-signature-canvas';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, fonts } from '@/theme';
import GradientButton from '@/components/GradientButton';
import { compressImage, saveSignatureDataUrl } from '@/lib/imageUtils';

export type SignatureValue = {
  mode: 'draw' | 'photo';
  file: { uri: string; name: string; type: string };
};

const CANVAS_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; margin: 0; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; margin: 0; }
  body, html { background-color: #ffffff; }
`;

export default function SignatureField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: SignatureValue | null;
  onChange: (value: SignatureValue | null) => void;
  required?: boolean;
}) {
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<SignatureViewRef>(null);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access to photograph a paper signature.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;
    const photo = await compressImage(result.assets[0], `${label}-signature.jpg`);
    onChange({ mode: 'photo', file: { uri: photo.uri, name: photo.name, type: photo.type } });
  };

  const onDrawn = (dataUrl: string) => {
    try {
      onChange({ mode: 'draw', file: saveSignatureDataUrl(dataUrl, label) });
      setDrawing(false);
    } catch (error: any) {
      Alert.alert('Signature', error?.message ?? 'Could not save the signature. Please try again.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        {value ? (
          <View style={styles.okBadge}>
            <Feather name="check" size={12} color={colors.emeraldDark} />
            <Text style={styles.okText}>{value.mode === 'draw' ? 'Signed' : 'Photo added'}</Text>
          </View>
        ) : null}
      </View>

      {value ? (
        <View style={styles.preview}>
          <Image source={{ uri: value.file.uri }} style={styles.previewImage} resizeMode="contain" />
          <Pressable onPress={() => onChange(null)} style={styles.clearBtn} hitSlop={8}>
            <Feather name="trash-2" size={14} color={colors.danger} />
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.modes}>
          <Pressable
            onPress={() => setDrawing(true)}
            style={({ pressed }) => [styles.mode, pressed && styles.pressed]}
          >
            <Feather name="edit-3" size={22} color={colors.primary} />
            <Text style={styles.modeTitle}>Draw</Text>
            <Text style={styles.modeHint}>Sign on screen</Text>
          </Pressable>
          <Pressable
            onPress={takePhoto}
            style={({ pressed }) => [styles.mode, pressed && styles.pressed]}
          >
            <Feather name="camera" size={22} color={colors.primary} />
            <Text style={styles.modeTitle}>Photo</Text>
            <Text style={styles.modeHint}>Signed on paper</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={drawing} animationType="slide" onRequestClose={() => setDrawing(false)}>
        <SafeAreaView style={styles.drawRoot}>
          <View style={styles.drawHeader}>
            <Pressable onPress={() => setDrawing(false)} hitSlop={10} style={styles.drawClose}>
              <Feather name="x" size={22} color={colors.ink} />
            </Pressable>
            <Text style={styles.drawTitle}>{label}</Text>
            <View style={styles.drawClose} />
          </View>
          <Text style={styles.drawHint}>Sign inside the box below</Text>
          <View style={styles.canvasWrap}>
            <SignatureCanvas
              ref={canvasRef}
              onOK={onDrawn}
              onEmpty={() => Alert.alert('Missing Signature', 'Please sign before saving.')}
              webStyle={CANVAS_STYLE}
              penColor="#0f172a"
              backgroundColor="#ffffff"
              minWidth={1.5}
              maxWidth={2.5}
              imageType="image/png"
              autoClear={false}
            />
            <View pointerEvents="none" style={styles.baseline} />
          </View>
          <View style={styles.drawFooter}>
            <Pressable
              onPress={() => canvasRef.current?.clearSignature()}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Feather name="rotate-ccw" size={16} color={colors.text} />
              <Text style={styles.secondaryText}>Clear</Text>
            </Pressable>
            <GradientButton
              label="Save Signature"
              icon="check"
              variant="primary"
              onPress={() => canvasRef.current?.readSignature()}
              style={styles.flex}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  wrap: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  okBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.emeraldSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  okText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.emeraldDark,
  },
  modes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mode: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  modeTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  modeHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.8,
  },
  preview: {
    height: 150,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  clearBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  clearText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.danger,
  },
  drawRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  drawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  drawClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  drawHint: {
    fontFamily: fonts.regular,
    textAlign: 'center',
    color: colors.muted,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  canvasWrap: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  baseline: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 60,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.faint,
  },
  drawFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.text,
  },
});
