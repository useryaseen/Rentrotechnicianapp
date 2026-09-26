/**
 * Gradient call-to-action button.
 *
 * Uses React Native's built-in CSS `linear-gradient` background (New Architecture),
 * so no extra native module is needed. `fallback` is painted underneath in case a
 * platform ignores the gradient.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, fonts } from '@/theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export const GRADIENTS = {
  start: { colors: ['#10b981', '#059669', '#047857'], shadow: '#059669' },
  end: { colors: ['#f43f5e', '#e11d48', '#be123c'], shadow: '#e11d48' },
  primary: { colors: ['#3b82f6', '#1d4ed8', '#1e3a8a'], shadow: '#1d4ed8' },
} as const;

export type GradientVariant = keyof typeof GRADIENTS;

export default function GradientButton({
  label,
  icon,
  variant = 'primary',
  onPress,
  loading,
  loadingLabel = 'Working…',
  disabled,
  style,
  compact,
}: {
  label: string;
  icon?: FeatherName;
  variant?: GradientVariant;
  onPress?: () => void;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const gradient = GRADIENTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: gradient.colors[1],
          experimental_backgroundImage: `linear-gradient(135deg, ${gradient.colors.join(', ')})`,
          shadowColor: gradient.shadow,
        },
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.surface} size="small" />
      ) : icon ? (
        <Feather name={icon} size={compact ? 16 : 18} color={colors.surface} />
      ) : null}
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
        {loading ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  compact: {
    minHeight: 48,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  inactive: {
    opacity: 0.65,
  },
  label: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: fontSize.body,
    letterSpacing: 0.2,
  },
  labelCompact: {
    fontSize: fontSize.sm + 1,
  },
});
