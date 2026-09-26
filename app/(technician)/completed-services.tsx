/**
 * Completed Services — service history grouped per day (spec §6.9).
 * GET /api/customers/getserivehistory/{techId}?fromDate&toDate
 */
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, fonts, radius, shadows, spacing } from '@/theme';
import { EmptyState, ErrorBanner, LoadingView, SearchBar } from '@/components/ui';
import { DateField } from '@/components/form';
import {
  useServiceHistoryRange,
  useServiceStatusList,
  useSupportTicketStatusList,
  useTechnicianIdentity,
  type Row,
} from '@/hooks/useTechnicianQueries';
import { addDays, formatDate, formatLongDate, formatTime, initialsOf, parseApiDate, toIsoDate } from '@/lib/format';
import {
  getHistoryServiceTypeLabel,
  getHistoryStatusMeta,
  isCompletedHistoryRow,
  normalizeHistoryRecord,
} from '@/lib/serviceUtils';

const RANGE_OPTIONS = [7, 14, 30] as const;

const TYPE_TONES: Record<string, { color: string; background: string }> = {
  Service: { color: colors.skyDark, background: colors.skySoft },
  'Support Ticket': { color: colors.amberDark, background: colors.amberSoft },
  Task: { color: colors.purple, background: colors.purpleSoft },
};

type Group = { key: string; date: Date | null; title: string; data: Row[] };

function SummaryTile({
  label,
  value,
  small,
  accent,
}: {
  label: string;
  value: string | number;
  small?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={[styles.tile, accent && styles.tileAccent]}>
      <Text style={[styles.tileLabel, accent && { color: colors.emeraldDark }]}>{label}</Text>
      <Text
        style={[small ? styles.tileValueSmall : styles.tileValue, accent && { color: colors.emeraldDark }]}
        numberOfLines={small ? 2 : 1}
      >
        {value}
      </Text>
    </View>
  );
}

function HistoryRow({
  record,
  statusList,
  ticketStatusList,
  first,
}: {
  record: Row;
  statusList?: { code: string; description: string }[];
  ticketStatusList?: Record<string, string>;
  first: boolean;
}) {
  const status = getHistoryStatusMeta(record, statusList, ticketStatusList);
  const completed = isCompletedHistoryRow(record);
  const type = getHistoryServiceTypeLabel(record);
  const tone = TYPE_TONES[type] ?? TYPE_TONES.Service;
  const start = formatTime(record.taskInitiated);
  const end = completed ? formatTime(record.serviceDate) : '';
  const meta = [
    start ? `Start ${start}` : '',
    end ? `End ${end}` : '',
    record.accCode,
    record.attendeeMobNo,
  ].filter(Boolean);

  return (
    <View style={[styles.row, !first && styles.rowBorder]}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>{initialsOf(record.accName || record.accCode || '?')}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {record.accName || record.accCode || 'Unknown customer'}
        </Text>
        <View style={styles.rowChips}>
          <View style={[styles.chip, { backgroundColor: tone.background }]}>
            <Text style={[styles.chipText, { color: tone.color }]}>{type}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: status.background }]}>
            <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        {meta.length ? (
          <Text style={styles.rowMeta} numberOfLines={2}>
            {meta.join('  ·  ')}
          </Text>
        ) : null}
        {record.attendeeName ? (
          <View style={styles.attendee}>
            <Feather name="user" size={12} color={colors.muted} />
            <Text style={styles.attendeeText} numberOfLines={1}>
              {record.attendeeName}
            </Text>
          </View>
        ) : null}
        {record.attendeeNotes ? (
          <Text style={styles.notes} numberOfLines={2}>
            “{record.attendeeNotes}”
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function CompletedServices() {
  const { techId } = useTechnicianIdentity();
  const [fromDate, setFromDate] = useState(() => addDays(new Date(), -6) as Date);
  const [toDate, setToDate] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const historyQuery = useServiceHistoryRange(toIsoDate(fromDate), toIsoDate(toDate));
  const statusQuery = useServiceStatusList();
  const ticketStatusQuery = useSupportTicketStatusList();

  const records = useMemo(
    () => ((historyQuery.data ?? []) as Row[]).map(normalizeHistoryRecord),
    [historyQuery.data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r: Row) =>
      [r.accName, r.accCode, r.attendeeName, r.attendeeMobNo].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [records, search]);

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    filtered.forEach((r: Row) => {
      const date = parseApiDate(r.serviceDate);
      const key = date ? toIsoDate(date) : 'unknown';
      if (!map.has(key)) {
        map.set(key, { key, date, title: date ? formatLongDate(date) : 'Unknown date', data: [] });
      }
      map.get(key)!.data.push(r);
    });
    const time = (r: Row) => parseApiDate(r.serviceDate)?.getTime() ?? 0;
    return Array.from(map.values())
      .map((g) => ({ ...g, data: [...g.data].sort((a, b) => time(b) - time(a)) }))
      .sort((a, b) => (a.date && b.date ? b.date.getTime() - a.date.getTime() : a.date ? -1 : 1));
  }, [filtered]);

  const uniqueCustomers = useMemo(
    () => new Set(records.map((r: Row) => r.accCode).filter(Boolean)).size,
    [records]
  );

  const applyQuickRange = (days: number) => {
    setFromDate(addDays(new Date(), -(days - 1)) as Date);
    setToDate(new Date());
  };
  const activeQuick = RANGE_OPTIONS.find(
    (days) =>
      toIsoDate(toDate) === toIsoDate(new Date()) &&
      toIsoDate(fromDate) === toIsoDate(addDays(new Date(), -(days - 1)) as Date)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await historyQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.hero}>
        <View style={styles.heroBubble} />
        <Text style={styles.eyebrow}>Completed Services</Text>
        <Text style={styles.heroTitle}>Service history</Text>
        <Text style={styles.heroSubtitle}>All services completed by tech {techId || '—'}</Text>
        <View style={styles.heroActions}>
          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            style={({ pressed }) => [styles.heroBtn, showFilters && styles.heroBtnActive, pressed && styles.pressed]}
          >
            <Feather name="filter" size={14} color={showFilters ? colors.surface : colors.emeraldDark} />
            <Text style={[styles.heroBtnText, showFilters && { color: colors.surface }]}>
              {showFilters ? 'Hide filters' : 'Filters'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onRefresh}
            disabled={historyQuery.isFetching}
            style={({ pressed }) => [styles.heroBtn, pressed && styles.pressed]}
          >
            <Feather name="refresh-cw" size={14} color={colors.emeraldDark} />
            <Text style={styles.heroBtnText}>{historyQuery.isFetching ? 'Loading…' : 'Refresh'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.quickRow}>
        {RANGE_OPTIONS.map((days) => {
          const active = activeQuick === days;
          return (
            <Pressable
              key={days}
              onPress={() => applyQuickRange(days)}
              style={[styles.quick, active && styles.quickActive]}
            >
              <Text style={[styles.quickText, active && styles.quickTextActive]}>Last {days} days</Text>
            </Pressable>
          );
        })}
      </View>

      {showFilters ? (
        <View style={styles.filters}>
          <View style={styles.dateRow}>
            <DateField
              label="From"
              value={fromDate}
              onChange={(d) => setFromDate(d > toDate ? toDate : d)}
              maximumDate={new Date()}
              style={styles.flex}
            />
            <DateField
              label="To"
              value={toDate}
              onChange={(d) => setToDate(d < fromDate ? fromDate : d)}
              maximumDate={new Date()}
              style={styles.flex}
            />
          </View>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search customer, code or attendee…" />
        </View>
      ) : null}

      {historyQuery.error ? <ErrorBanner error={historyQuery.error} onRetry={onRefresh} /> : null}

      <View style={styles.tiles}>
        <SummaryTile label="Total completed" value={records.length} />
        <SummaryTile label="Active days" value={groups.length} />
        <SummaryTile label="Period" value={`${formatDate(fromDate)} – ${formatDate(toDate)}`} small />
        <SummaryTile label="Unique customers" value={uniqueCustomers} accent />
      </View>
    </View>
  );

  if (historyQuery.isLoading && !records.length) return <LoadingView label="Loading completed services…" />;

  return (
    <SectionList
      style={styles.flex}
      sections={groups}
      keyExtractor={(item, index) => `${item.uuid || item.accCode}-${index}`}
      contentContainerStyle={styles.content}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        historyQuery.error ? null : records.length ? (
          <EmptyState icon="search" title="No matching records" subtitle="Try a different search term." />
        ) : (
          <EmptyState
            icon="check-circle"
            title="No completed services"
            subtitle="No services completed in the selected date range."
          />
        )
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.groupHead}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{section.date ? section.date.getDate() : '—'}</Text>
          </View>
          <Text style={styles.groupTitle}>{section.title}</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>
              {section.data.length} service{section.data.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      )}
      renderItem={({ item, index, section }) => (
        <View
          style={[
            styles.groupBody,
            index === 0 && styles.groupBodyFirst,
            index === section.data.length - 1 && styles.groupBodyLast,
          ]}
        >
          <HistoryRow
            record={item}
            statusList={statusQuery.data}
            ticketStatusList={ticketStatusQuery.data}
            first={index === 0}
          />
        </View>
      )}
      SectionSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  pressed: {
    opacity: 0.85,
  },
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  hero: {
    borderRadius: radius.lg + 8,
    padding: spacing.xl,
    overflow: 'hidden',
    backgroundColor: colors.emeraldSoft,
    experimental_backgroundImage: 'linear-gradient(135deg, #d1fae5 0%, #ecfdf5 55%, #ffffff 100%)',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  heroBubble: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.emerald,
    opacity: 0.08,
    top: -50,
    right: -40,
  },
  eyebrow: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.emeraldDark,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xxl,
    letterSpacing: -0.4,
    color: colors.ink,
    marginTop: 4,
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 2,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  heroBtnActive: {
    backgroundColor: colors.emeraldDark,
    borderColor: colors.emeraldDark,
  },
  heroBtnText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.emeraldDark,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quick: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActive: {
    backgroundColor: colors.emeraldDark,
    borderColor: colors.emeraldDark,
  },
  quickText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  quickTextActive: {
    color: colors.surface,
  },
  filters: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileAccent: {
    backgroundColor: colors.emeraldSoft,
    borderColor: '#a7f3d0',
  },
  tileLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tileValue: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xxl,
    letterSpacing: -0.4,
    color: colors.ink,
    marginTop: 4,
  },
  tileValueSmall: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: 8,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  dayBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.emeraldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    color: colors.emeraldDark,
  },
  groupTitle: {
    fontFamily: fonts.semibold,
    flex: 1,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  countPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  groupBody: {
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  groupBodyFirst: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  groupBodyLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.emeraldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    color: colors.emeraldDark,
  },
  rowTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  rowChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
  },
  rowMeta: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs + 1,
    color: colors.muted,
    marginTop: 6,
  },
  attendee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  attendeeText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs + 1,
    color: colors.text,
  },
  notes: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs + 1,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
  },
});
