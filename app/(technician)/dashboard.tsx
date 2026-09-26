import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, shadows, spacing, fonts } from '@/theme';
import { Avatar, Card, Chip, EmptyState, ErrorBanner, LoadingView, SectionTitle } from '@/components/ui';
import {
  splitMyTasks,
  useMyTasksRaw,
  useRefreshTechnician,
  useServiceHistory,
  useServiceList,
  useServiceRequests,
  useServiceStatusList,
  useTechnicianIdentity,
  type Row,
} from '@/hooks/useTechnicianQueries';
import { pickField, pickText } from '@/lib/apiHelpers';
import {
  formatDate,
  formatDateTime,
  greetingForNow,
  initialsOf,
  isBeforeToday,
  isSameDay,
  parseApiDate,
} from '@/lib/format';
import {
  getHistoryServiceTypeLabel,
  getHistoryStatusMeta,
  getStatusCode,
  getStatusMeta,
  getTaskPhase,
  isCompletedHistoryRow,
  normalizeHistoryRecord,
} from '@/lib/serviceUtils';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const RANGES = [7, 14, 30] as const;

/**
 * Free-text schedule status (`pending` / `inprogress` / `completed` …).
 * Rows that only carry status codes fall back to the task phase.
 */
function taskState(row: Row): 'pending' | 'inprogress' | 'completed' | 'cancelled' | 'other' {
  const text = String(pickField(row, ['schedule_Status', 'scheduleStatus', 'ScheduleStatus']) ?? '')
    .trim()
    .toLowerCase();
  if (text === 'pending' || text === 'scheduled') return 'pending';
  if (text === 'inprogress' || text === 'in progress') return 'inprogress';
  if (text === 'completed') return 'completed';
  if (text === 'cancelled') return 'cancelled';
  if (text && !/^\d+$/.test(text)) return 'other';
  const phase = getTaskPhase(row);
  if (phase === 'started') return 'inprogress';
  if (phase === 'closed') return 'completed';
  return 'pending';
}

function taskDate(row: Row) {
  return pickField(row, ['schedule_Date', 'scheduleDate', 'service_Date', 'serviceDate']);
}

function KpiTile({
  label,
  value,
  icon,
  color,
  soft,
  onPress,
}: {
  label: string;
  value: number;
  icon: FeatherName;
  color: string;
  soft: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.kpi, pressed && styles.kpiPressed]}
    >
      <View style={[styles.kpiIcon, { backgroundColor: soft }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { displayName, techId } = useTechnicianIdentity();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const refresh = useRefreshTechnician();
  const [refreshing, setRefreshing] = useState(false);

  const statusQuery = useServiceStatusList();
  const servicesQuery = useServiceList();
  const requestsQuery = useServiceRequests();
  const tasksQuery = useMyTasksRaw();
  const historyQuery = useServiceHistory(range);

  const queries = [statusQuery, servicesQuery, requestsQuery, tasksQuery, historyQuery];
  const firstError = queries.find((q) => q.error)?.error;
  const initialLoading =
    tasksQuery.isLoading && servicesQuery.isLoading && historyQuery.isLoading;

  const stats = useMemo(() => {
    const history: Row[] = historyQuery.data ?? [];
    const requests: Row[] = requestsQuery.data ?? [];
    const { services, tickets } = splitMyTasks(tasksQuery.data);
    const tasks: Row[] = [...services, ...tickets];
    const today = new Date();

    const historyToday = history.filter((row) =>
      isSameDay(pickField(row, ['serviceDate', 'service_date', 'ServiceDate']), today)
    ).length;
    const tasksClosedToday = tasks.filter(
      (row) => taskState(row) === 'completed' && isSameDay(taskDate(row), today)
    ).length;

    const openRequests = requests.filter((row) => {
      const status = pickText(row, ['complaintStatus', 'ComplaintStatus']).toLowerCase();
      return status !== 'closed' && status !== '010';
    }).length;

    return {
      completed: history.length,
      closedToday: historyToday + tasksClosedToday,
      openRequests,
      pending: tasks.filter((row) => taskState(row) === 'pending').length,
      inProgress: tasks.filter((row) => taskState(row) === 'inprogress').length,
      overdue: tasks.filter((row) => {
        const state = taskState(row);
        return state !== 'completed' && state !== 'cancelled' && isBeforeToday(taskDate(row));
      }).length,
    };
  }, [historyQuery.data, requestsQuery.data, tasksQuery.data]);

  const recent = useMemo(() => {
    return (historyQuery.data ?? [])
      .map(normalizeHistoryRecord)
      .sort((a: Row, b: Row) => {
        const da = parseApiDate(a.serviceDate)?.getTime() ?? 0;
        const db = parseApiDate(b.serviceDate)?.getTime() ?? 0;
        return db - da;
      })
      .slice(0, 6);
  }, [historyQuery.data]);

  const byStatus = useMemo(() => {
    const counts = new Map<string, number>();
    (servicesQuery.data ?? []).forEach((row: Row) => {
      const code = getStatusCode(row) || '000';
      counts.set(code, (counts.get(code) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, count]) => ({ meta: getStatusMeta(code, statusQuery.data), count }));
  }, [servicesQuery.data, statusQuery.data]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (initialLoading) return <LoadingView label="Loading your dashboard…" />;

  const go = (href: Href) => () => router.push(href);
  const totalServices = byStatus.reduce((sum, item) => sum + item.count, 0);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.bubble, styles.bubbleA]} />
        <View style={[styles.bubble, styles.bubbleB]} />
        <Text style={styles.greeting}>{greetingForNow()},</Text>
        <Text style={styles.heroName} numberOfLines={1}>
          {displayName} 👋
        </Text>
        <View style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Feather name="user-check" size={13} color={colors.surface} />
            <Text style={styles.heroChipText}>Tech ID {techId}</Text>
          </View>
          <View style={styles.heroChip}>
            <Feather name="calendar" size={13} color={colors.surface} />
            <Text style={styles.heroChipText}>{formatDate(new Date())}</Text>
          </View>
        </View>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{stats.completed}</Text>
          <Text style={styles.heroStatLabel}>
            services completed in the last {range} days
          </Text>
        </View>
      </View>

      {firstError ? <ErrorBanner error={firstError} onRetry={onRefresh} /> : null}

      {/* Range picker */}
      <View style={styles.rangeRow}>
        {RANGES.map((days) => {
          const active = days === range;
          return (
            <Pressable
              key={days}
              onPress={() => setRange(days)}
              style={[styles.rangeBtn, active && styles.rangeBtnActive]}
            >
              <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                Last {days} days
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiTile
          label="Completed"
          value={stats.completed}
          icon="check-circle"
          color={colors.emeraldDark}
          soft={colors.emeraldSoft}
          onPress={go('/completed-services')}
        />
        <KpiTile
          label="Closed Today"
          value={stats.closedToday}
          icon="award"
          color={colors.sky}
          soft={colors.skySoft}
          onPress={go('/completed-services')}
        />
        <KpiTile
          label="Open Requests"
          value={stats.openRequests}
          icon="message-circle"
          color={colors.amberDark}
          soft={colors.amberSoft}
          onPress={go({ pathname: '/tasks', params: { tab: 'tickets' } })}
        />
        <KpiTile
          label="Pending"
          value={stats.pending}
          icon="clock"
          color={colors.primary}
          soft={colors.primarySoft}
          onPress={go('/tasks')}
        />
        <KpiTile
          label="In Progress"
          value={stats.inProgress}
          icon="play-circle"
          color={colors.purple}
          soft={colors.purpleSoft}
          onPress={go('/tasks')}
        />
        <KpiTile
          label="Overdue"
          value={stats.overdue}
          icon="alert-triangle"
          color={colors.rose}
          soft={colors.roseSoft}
          onPress={go('/tasks')}
        />
      </View>

      {/* Services by status */}
      <Card>
        <SectionTitle
          title="Services by Status"
          right={<Chip label={`${totalServices} total`} color={colors.primary} background={colors.primarySoft} />}
        />
        {byStatus.length === 0 ? (
          <Text style={styles.muted}>No services assigned yet.</Text>
        ) : (
          <View style={styles.statusGrid}>
            {byStatus.map(({ meta, count }) => (
              <Pressable
                key={meta.code}
                onPress={go('/tasks')}
                style={[styles.statusTile, { backgroundColor: meta.background }]}
              >
                <Text style={[styles.statusCount, { color: meta.color }]}>{count}</Text>
                <Text style={[styles.statusLabel, { color: meta.color }]} numberOfLines={1}>
                  {meta.label}
                </Text>
                <Text style={[styles.statusCode, { color: meta.color }]}>#{meta.code}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      {/* Recent activity */}
      <Card>
        <SectionTitle
          title="Recent Activity"
          right={
            <Pressable onPress={go('/completed-services')} hitSlop={8} style={styles.viewMore}>
              <Text style={styles.viewMoreText}>View more</Text>
              <Feather name="chevron-right" size={15} color={colors.primary} />
            </Pressable>
          }
        />
        {recent.length === 0 ? (
          <EmptyState
            icon="activity"
            title="No recent activity"
            subtitle={`Nothing completed in the last ${range} days.`}
          />
        ) : (
          recent.map((row: Row, index: number) => {
            const status = getHistoryStatusMeta(row, statusQuery.data, null);
            const completed = isCompletedHistoryRow(row);
            const start = formatDateTime(row.taskInitiated);
            const end = completed ? formatDateTime(row.serviceDate) : '';
            return (
              <View
                key={`${row.uuid}-${index}`}
                style={[styles.activity, index > 0 && styles.activityBorder]}
              >
                <Avatar text={initialsOf(row.accName)} size={40} />
                <View style={styles.flex}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {row.accName}
                  </Text>
                  <Text style={styles.activityMeta} numberOfLines={2}>
                    {start ? `Start: ${start}` : ''}
                    {end ? `${start ? ' · ' : ''}End: ${end}` : ''}
                    {!start && !end ? formatDateTime(row.serviceDate, '—') : ''}
                  </Text>
                  <View style={styles.activityChips}>
                    <Chip label={getHistoryServiceTypeLabel(row)} />
                    <Chip label={status.label} color={status.color} background={status.background} />
                  </View>
                  {row.attendeeName ? (
                    <Text style={styles.activityMeta} numberOfLines={1}>
                      Attendee: {row.attendeeName}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
        <Pressable
          onPress={go('/completed-services')}
          style={({ pressed }) => [styles.viewAll, pressed && styles.kpiPressed]}
        >
          <Text style={styles.viewAllText}>View all completed services</Text>
          <Feather name="arrow-right" size={16} color={colors.emeraldDark} />
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    backgroundColor: colors.primary,
    experimental_backgroundImage: 'linear-gradient(135deg, #4f7df5 0%, #1d4ed8 55%, #1e3a8a 100%)',
    borderRadius: radius.lg + 8,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  bubbleA: {
    width: 180,
    height: 180,
    top: -70,
    right: -50,
    opacity: 0.1,
  },
  bubbleB: {
    width: 110,
    height: 110,
    bottom: -40,
    right: 60,
    opacity: 0.08,
  },
  greeting: {
    fontFamily: fonts.medium,
    color: colors.primarySoft,
    fontSize: fontSize.body,
  },
  heroName: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: fontSize.xxl,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  heroChipText: {
    fontFamily: fonts.medium,
    color: colors.surface,
    fontSize: fontSize.xs,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  heroStatValue: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: fontSize.xxl,
  },
  heroStatLabel: {
    fontFamily: fonts.medium,
    flex: 1,
    color: colors.primarySoft,
    fontSize: fontSize.sm,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rangeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeBtnActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  rangeText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  rangeTextActive: {
    color: colors.surface,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpi: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  kpiPressed: {
    opacity: 0.85,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  kpiValue: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xl,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  kpiLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusTile: {
    flexBasis: '46%',
    flexGrow: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statusCount: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xl,
  },
  statusLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statusCode: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    opacity: 0.7,
    marginTop: 2,
  },
  muted: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  activity: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  activityBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  activityTitle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  activityMeta: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs + 1,
    color: colors.muted,
    marginTop: 2,
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  viewMoreText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs + 1,
    color: colors.primary,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.emeraldSoft,
  },
  viewAllText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm + 1,
    color: colors.emeraldDark,
  },
  activityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
  },
});
