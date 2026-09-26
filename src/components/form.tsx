/**
 * Shared form controls: text field, date field, chips, and a searchable select sheet.
 */
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors, fontSize, fonts, radius, spacing } from '@/theme';
import { SearchBar } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';

export type Option = { code: string; name: string };

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  required,
  editable = true,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  required?: boolean;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        multiline={multiline}
        keyboardType={keyboardType}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          focused && styles.inputFocused,
          !editable && styles.inputDisabled,
        ]}
      />
    </View>
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toInputDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toInputDateTime = (d: Date) => `${toInputDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** Keep the time of `base` and take the calendar day from `day`. */
function withDay(base: Date, day: Date) {
  const next = new Date(base);
  next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return next;
}

/** Keep the day of `base` and take the hours/minutes from `time`. */
function withTime(base: Date, time: Date) {
  const next = new Date(base);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
}

/**
 * Tappable date (or date + time) field.
 *  - Android: native dialog (date, then time in `datetime` mode)
 *  - iOS: inline calendar / time spinner
 *  - Web: the browser's own date input
 */
export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  maximumDate,
  minimumDate,
  required,
  style,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'datetime';
  maximumDate?: Date;
  minimumDate?: Date;
  required?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  // Which picker is showing as a component (iOS inline, or the Android fallback).
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const display = mode === 'datetime' ? formatDateTime(value) : formatDate(value);

  const openAndroid = () => {
    try {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: (event, date) => {
          if (event.type !== 'set' || !date) return;
          const day = withDay(value, date);
          if (mode !== 'datetime') {
            onChange(day);
            return;
          }
          DateTimePickerAndroid.open({
            value: day,
            mode: 'time',
            is24Hour: true,
            onChange: (timeEvent, time) => {
              // Keep the picked day even if the time dialog is dismissed.
              onChange(timeEvent.type === 'set' && time ? withTime(day, time) : day);
            },
          });
        },
      });
    } catch {
      setPicker('date');
    }
  };

  const open = () => {
    if (Platform.OS === 'android') openAndroid();
    else if (Platform.OS === 'ios') setPicker((p) => (p ? null : 'date'));
  };

  const labelNode = (
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );

  if (Platform.OS === 'web') {
    const inputType = mode === 'datetime' ? 'datetime-local' : 'date';
    const toValue = mode === 'datetime' ? toInputDateTime : toInputDate;
    return (
      <View style={[styles.field, style]}>
        {labelNode}
        <View style={styles.selectBtn}>
          <Feather name="calendar" size={17} color={colors.primary} />
          {React.createElement('input', {
            type: inputType,
            value: toValue(value),
            max: maximumDate ? toValue(maximumDate) : undefined,
            min: minimumDate ? toValue(minimumDate) : undefined,
            onChange: (e: { target: { value: string } }) => {
              const text = e.target.value;
              if (!text) return;
              const [datePart, timePart] = text.split('T');
              const [y, m, d] = datePart.split('-').map(Number);
              const next = new Date(value);
              next.setFullYear(y, m - 1, d);
              if (timePart) {
                const [hh, mm] = timePart.split(':').map(Number);
                next.setHours(hh, mm, 0, 0);
              }
              onChange(next);
            },
            style: {
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: fontSize.body,
              fontFamily: fonts.regular,
              color: colors.ink,
              minHeight: 44,
            },
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.field, style]}>
      {labelNode}
      <Pressable
        onPress={open}
        style={({ pressed }) => [styles.selectBtn, pressed && styles.selectBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}. Tap to change`}
      >
        <Feather name="calendar" size={17} color={colors.primary} />
        <Text style={styles.selectText} numberOfLines={1}>
          {display}
        </Text>
        <Feather name="edit-2" size={14} color={colors.primary} />
      </Pressable>

      {picker ? (
        <View style={Platform.OS === 'ios' ? styles.iosPicker : undefined}>
          <DateTimePicker
            value={value}
            mode={Platform.OS === 'ios' && mode === 'datetime' ? 'datetime' : picker}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(event, date) => {
              if (Platform.OS === 'ios') {
                if (date) onChange(date);
                return;
              }
              // Android fallback component: date → (time) → close.
              if (event.type !== 'set' || !date) {
                setPicker(null);
                return;
              }
              if (picker === 'date') {
                const day = withDay(value, date);
                onChange(day);
                setPicker(mode === 'datetime' ? 'time' : null);
              } else {
                onChange(withTime(value, date));
                setPicker(null);
              }
            }}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setPicker(null)} style={styles.iosDone}>
              <Text style={styles.iosDoneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ChoiceChips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.choice, active && styles.choiceActive]}
          >
            {active ? <Feather name="check" size={13} color={colors.surface} /> : null}
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tappable field that opens a searchable full-screen list. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  required,
  loading,
}: {
  label: string;
  value: Option | null;
  options: Option[];
  onChange: (option: Option) => void;
  placeholder?: string;
  required?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(term) || o.code.toLowerCase().includes(term)
    );
  }, [options, search]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable onPress={() => setOpen(true)} style={styles.selectBtn}>
        <Text style={[styles.selectText, !value && { color: colors.faint }]} numberOfLines={1}>
          {value ? value.name : loading ? 'Loading…' : placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.faint} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.sheetRoot}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} style={styles.sheetClose}>
              <Feather name="x" size={22} color={colors.ink} />
            </Pressable>
            <Text style={styles.sheetTitle}>{label}</Text>
            <View style={styles.sheetClose} />
          </View>
          <View style={styles.sheetSearch}>
            <SearchBar value={search} onChangeText={setSearch} placeholder={`Search ${label.toLowerCase()}`} />
          </View>
          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.code}-${index}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetList}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            ListEmptyComponent={
              <Text style={styles.sheetEmpty}>{loading ? 'Loading…' : 'No matches found.'}</Text>
            }
            renderItem={({ item }) => {
              const active = value?.code === item.code;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    setSearch('');
                    setOpen(false);
                  }}
                  style={[styles.sheetRow, active && styles.sheetRowActive]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.sheetRowName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.code && item.code !== item.name ? (
                      <Text style={styles.sheetRowCode}>{item.code}</Text>
                    ) : null}
                  </View>
                  {active ? <Feather name="check-circle" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export function FormSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Feather name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export const formStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  field: {
    gap: spacing.xs + 2,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  input: {
    fontFamily: fonts.regular,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  inputMultiline: {
    minHeight: 90,
    paddingTop: spacing.md,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  selectBtnPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  iosPicker: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  iosDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  iosDoneText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.primary,
  },
  selectText: {
    fontFamily: fonts.regular,
    flex: 1,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  choiceTextActive: {
    color: colors.surface,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#1e293b',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs + 1,
    color: colors.muted,
    marginTop: 1,
  },
  sectionBody: {
    gap: spacing.lg,
  },
  sheetRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  sheetSearch: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sheetList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetEmpty: {
    fontFamily: fonts.regular,
    textAlign: 'center',
    color: colors.muted,
    paddingVertical: spacing.xl,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sheetRowActive: {
    borderColor: colors.primary,
  },
  sheetRowName: {
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  sheetRowCode: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },
});
