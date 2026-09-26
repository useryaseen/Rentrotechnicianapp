/**
 * Searchable part picker for the End Task BOM section (spec §6.5).
 * Searches `ite_Code` / `ite_Name`, shows at most 30 results, hides items already added.
 */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, fonts } from '@/theme';
import { SearchBar } from '@/components/ui';

export type Item = { code: string; name: string };

const MAX_RESULTS = 30;

export default function ItemPickerModal({
  visible,
  items,
  loading,
  excludeCodes,
  onSelect,
  onClose,
}: {
  visible: boolean;
  items: Item[];
  loading?: boolean;
  excludeCodes: string[];
  onSelect: (item: Item) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    const excluded = new Set(excludeCodes);
    const out: Item[] = [];
    for (const item of items) {
      if (excluded.has(item.code)) continue;
      if (term && !item.code.toLowerCase().includes(term) && !item.name.toLowerCase().includes(term)) {
        continue;
      }
      out.push(item);
      if (out.length >= MAX_RESULTS) break;
    }
    return out;
  }, [items, search, excludeCodes]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Feather name="x" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>Select Part</Text>
          <View style={styles.close} />
        </View>
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search by code or name" />
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Loading parts…</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListEmptyComponent={<Text style={[styles.muted, styles.empty]}>No matching parts.</Text>}
            ListFooterComponent={
              results.length >= MAX_RESULTS ? (
                <Text style={[styles.muted, styles.empty]}>Showing first {MAX_RESULTS} — refine your search.</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  setSearch('');
                }}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.divider }]}
              >
                <View style={styles.rowIcon}>
                  <Feather name="box" size={16} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name || item.code}
                  </Text>
                  <Text style={styles.code}>{item.code}</Text>
                </View>
                <Feather name="plus-circle" size={20} color={colors.primary} />
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sep: {
    height: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm + 1,
    color: colors.ink,
  },
  code: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },
  muted: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
