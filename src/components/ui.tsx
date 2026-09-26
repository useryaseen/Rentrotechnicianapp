/**
 * Small shared UI kit for the technician screens.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, shadows, spacing, touchTarget, fonts } from '@/theme';
import { getErrorMessage, isNetworkError } from '@/lib/apiHelpers';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({
  label,
  color = colors.slateDark,
  background = colors.slateSoft,
  icon,
}: {
  label: string;
  color?: string;
  background?: string;
  icon?: FeatherName;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      {icon ? <Feather name={icon} size={12} color={color} /> : null}
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Avatar({ text, color = colors.primary, soft = colors.primarySoft, size = 44 }: {
  text: string;
  color?: string;
  soft?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: soft },
      ]}
    >
      <Text style={[styles.avatarText, { color, fontSize: size * 0.36 }]}>{text}</Text>
    </View>
  );
}

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.centerText}>{label}</Text>
    </View>
  );
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = isNetworkError(error)
    ? "No connection — your data will refresh when you're back online."
    : getErrorMessage(error, 'Something went wrong while loading data.');
  return (
    <View style={styles.errorBox}>
      <Feather name="alert-triangle" size={18} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  subtitle,
}: {
  icon?: FeatherName;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
                <Text style={[styles.segmentBadgeText, active && styles.segmentBadgeTextActive]}>
                  {option.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.search}>
      <Feather name="search" size={18} color={colors.faint} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Feather name="x-circle" size={18} color={colors.faint} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    maxWidth: '100%',
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.semibold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  centerText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.muted,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    fontFamily: fonts.medium,
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.sm,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
  retryText: {
    fontFamily: fonts.medium,
    color: colors.surface,
    fontSize: fontSize.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 1.5,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.lg,
    color: colors.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.slateSoft,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: touchTarget - 4,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  segmentText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.muted,
    flexShrink: 1,
  },
  segmentTextActive: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  segmentBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  segmentBadgeActive: {
    backgroundColor: colors.primary,
  },
  segmentBadgeText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  segmentBadgeTextActive: {
    color: colors.surface,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget + 4,
  },
  searchInput: {
    fontFamily: fonts.regular,
    flex: 1,
    fontSize: fontSize.body,
    color: colors.ink,
    paddingVertical: spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
});
