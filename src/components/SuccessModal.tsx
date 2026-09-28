/**
 * Success confirmation sheet ("Task Ended Successfully").
 *
 * Same reason as `ConfirmModal`: `react-native-web`'s `Alert` is a no-op
 * (`static alert() {}`), so success feedback built on `Alert.alert` is invisible on web.
 *
 * The sheet stays up for `autoCloseMs` and then runs `onAction` by itself, so the app always
 * returns to the tasks screen without the technician having to tap anything. `onAction` is also
 * wired to the button and to the backdrop / hardware back.
 */
import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, spacing, fonts } from '@/theme';
import GradientButton from '@/components/GradientButton';

export default function SuccessModal({
  visible,
  title,
  message,
  detail,
  actionLabel = 'Done',
  autoCloseMs = 2000,
  onAction,
}: {
  visible: boolean;
  title: string;
  message: string;
  /** Optional extra line — e.g. where the app is about to navigate. */
  detail?: string;
  actionLabel?: string;
  /** Auto-continue after this many ms. Pass `0` to wait for a tap. */
  autoCloseMs?: number;
  onAction: () => void;
}) {
  // Keep the latest callback in a ref (updated in an effect) so re-renders can never
  // restart the auto-close timer.
  const actionRef = useRef(onAction);
  useEffect(() => {
    actionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (!visible || !autoCloseMs) return;
    const timer = setTimeout(() => actionRef.current(), autoCloseMs);
    return () => clearTimeout(timer);
  }, [visible, autoCloseMs]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onAction}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onAction} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <View style={styles.icon}>
                <Feather name="check" size={30} color={colors.surface} />
              </View>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {detail ? <Text style={styles.detail}>{detail}</Text> : null}
          </View>

          <View style={styles.footer}>
            <GradientButton
              label={actionLabel}
              icon="arrow-right"
              onPress={onAction}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
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
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xl,
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.text,
    textAlign: 'center',
  },
  detail: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
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
});
