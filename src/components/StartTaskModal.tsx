/**
 * "Start Task?" confirmation sheet with optional before-service photos (spec §6.3).
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, fonts } from '@/theme';
import GradientButton from '@/components/GradientButton';
import PhotoPicker, { type LocalImage } from '@/components/PhotoPicker';
import { buildAddress } from '@/lib/serviceUtils';
import { hasText } from '@/lib/apiHelpers';

type Row = Record<string, any>;

function SummaryRow({ icon, text }: { icon: React.ComponentProps<typeof Feather>['name']; text: string }) {
  if (!text) return null;
  return (
    <View style={styles.summaryRow}>
      <Feather name={icon} size={14} color={colors.muted} />
      <Text style={styles.summaryText} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

export default function StartTaskModal({
  task,
  kindLabel = 'task',
  loading,
  onCancel,
  onConfirm,
}: {
  /** The row to start; the sheet is hidden while this is null. */
  task: Row | null;
  kindLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (images: LocalImage[]) => void;
}) {
  const [images, setImages] = useState<LocalImage[]>([]);
  const [shownFor, setShownFor] = useState<Row | null>(null);

  // Reset the photos whenever the sheet opens for a different task.
  if (task !== shownFor) {
    setShownFor(task);
    setImages([]);
  }

  const asset = [task?.assetCode, task?.assetName].filter(hasText).join(' · ');

  return (
    <Modal
      visible={!!task}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.iconWrap}>
              <View style={styles.icon}>
                <Feather name="play" size={26} color={colors.surface} />
              </View>
            </View>
            <Text style={styles.title}>Start {kindLabel === 'ticket' ? 'Ticket' : 'Task'}?</Text>
            <Text style={styles.subtitle}>Are you sure you want to start this {kindLabel}?</Text>

            {task ? (
              <View style={styles.summary}>
                <Text style={styles.customer} numberOfLines={1}>
                  {task.accName || 'Customer'}
                </Text>
                <SummaryRow icon="cpu" text={asset} />
                <SummaryRow icon="map-pin" text={buildAddress(task)} />
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Before-service photos</Text>
                <Text style={styles.count}>{images.length} added</Text>
              </View>
              <Text style={styles.hint}>
                Capture the asset before you begin. Photos are compressed before upload.
              </Text>
              <PhotoPicker images={images} onChange={setImages} prefix="before" disabled={loading} />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onCancel}
              disabled={loading}
              style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <GradientButton
              label="Start Now"
              icon="play"
              variant="start"
              loading={loading}
              loadingLabel="Starting…"
              onPress={() => onConfirm(images)}
              style={styles.flex}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.sm + 2,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emerald,
    experimental_backgroundImage: 'linear-gradient(135deg, #34d399, #059669)',
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xl,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: -spacing.xs,
  },
  summary: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  customer: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  summaryText: {
    fontFamily: fonts.regular,
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  count: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  cancel: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.text,
  },
});
