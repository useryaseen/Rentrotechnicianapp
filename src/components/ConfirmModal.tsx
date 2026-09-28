/**
 * Cross-platform confirmation dialog ("Do you want to …?").
 *
 * `react-native-web`'s `Alert` is a no-op (`static alert() {}`), so a confirmation built on
 * `Alert.alert` never appears on web and the caller looks broken. This sheet renders the same
 * on web and native and mirrors the look of `StartTaskModal`.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, fonts } from '@/theme';
import GradientButton from '@/components/GradientButton';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export default function ConfirmModal({
  visible,
  title,
  message,
  detail,
  icon = 'help-circle',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  loading,
  loadingLabel = 'Working…',
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  /** Optional extra line — e.g. what happens once the user confirms. */
  detail?: string;
  icon?: FeatherName;
  confirmLabel?: string;
  cancelLabel?: string;
  /** The confirmed action closes/finishes something → red action button. */
  destructive?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // While the action is running the sheet cannot be dismissed.
  const dismiss = loading ? undefined : onCancel;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <View style={[styles.icon, destructive ? styles.iconDanger : styles.iconPrimary]}>
                <Feather name={icon} size={26} color={colors.surface} />
              </View>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {detail ? <Text style={styles.detail}>{detail}</Text> : null}
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={dismiss}
              disabled={loading}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <GradientButton
              label={confirmLabel}
              icon={destructive ? 'alert-octagon' : 'check'}
              variant={destructive ? 'end' : 'primary'}
              loading={loading}
              loadingLabel={loadingLabel}
              onPress={onConfirm}
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
  },
  iconDanger: {
    backgroundColor: colors.rose,
  },
  iconPrimary: {
    backgroundColor: colors.primary,
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
