import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fontSize, radius, spacing, fonts } from '@/theme';
import { EmptyState, ErrorBanner, LoadingView, SearchBar, Segmented } from '@/components/ui';
import { Feather } from '@expo/vector-icons';
import TaskCard, { getTaskAction, type TaskAction, type TaskKind } from '@/components/TaskCard';
import {
  useMyTasks,
  useRefreshTechnician,
  useInstallationStatusList,
  useServiceStatusList,
  useSupportTicketStatusList,
  type Row,
} from '@/hooks/useTechnicianQueries';
import { getErrorMessage, pickField } from '@/lib/apiHelpers';
import { startInstallation } from '@/api/technicianApi';
import { daysUntil, isSameDay } from '@/lib/format';
import {
  effectiveNextServiceDate,
  getTaskKey,
  sortByPinned,
} from '@/lib/serviceUtils';
import { getPinnedTasks, togglePinnedTask } from '@/lib/taskStorage';
import StartTaskModal from '@/components/StartTaskModal';
import SuccessModal from '@/components/SuccessModal';
import type { LocalImage } from '@/components/PhotoPicker';
import { TaskActionError, useStartTask } from '@/hooks/useTaskActions';

type DateFilter = 'all' | 'today' | 'week' | 'started';

/** How long the start-success sheet stays up before it dismisses itself. */
const SUCCESS_AUTO_CLOSE_MS = 2000;

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 Days' },
  { value: 'started', label: 'Started' },
];

const SEARCH_FIELDS = [
  'accName',
  'accCode',
  'contactPerson',
  'assetName',
  'assetCode',
  'areaName',
  'branchName',
  'streetName',
  'zoneName',
  'commodityName',
];

const EMPTY_COPY: Record<TaskKind, string> = {
  services: 'No services scheduled for you right now.',
  tickets: 'No open support tickets assigned to you.',
  installation: 'No installation jobs in progress.',
};

function filterDate(row: Row, kind: TaskKind) {
  if (kind === 'installation') {
    return pickField(row, ['installationDate', 'installationStDate', 'hiredOn', 'vrDate']);
  }
  if (kind === 'tickets') {
    return pickField(row, ['complaintDt', 'vrDate', 'nextServiceDate', 'lastServiceDate']);
  }
  return effectiveNextServiceDate(row);
}

function isStarted(row: Row, kind: TaskKind) {
  return getTaskAction(row, kind) === 'end';
}

export default function TasksIndex() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<TaskKind>('services');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [pinned, setPinned] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { services, tickets, installations, isLoading, error } = useMyTasks();
  const statusQuery = useServiceStatusList();
  const ticketStatusQuery = useSupportTicketStatusList();
  const installationStatusQuery = useInstallationStatusList();
  const refresh = useRefreshTechnician();
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [startTarget, setStartTarget] = useState<{ row: Row; kind: TaskKind; key: string } | null>(null);
  const startMutation = useStartTask();
  /** Success sheet shown after a task/installation starts (Alert is a no-op on web). */
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);

  const confirmStart = (images: LocalImage[]) => {
    if (!startTarget) return;
    // Belt and braces: the sheet already blocks this, but never start without a photo.
    if (!images.length) {
      Alert.alert(
        'Photo Required',
        'Add at least one before-service photo of the asset before starting this task.'
      );
      return;
    }
    const { row, key } = startTarget;
    startMutation.mutate(
      { task: row, images },
      {
        onSuccess: () => {
          setStartTarget(null);
          // Started tasks are auto-pinned; clear filters so the row is visible at the top.
          setPinned((prev) => (key && !prev.includes(key) ? [...prev, key] : prev));
          setSearch('');
          setDateFilter('all');
          setSuccess({
            title: 'Task Started',
            message: `${row.accName || 'The task'} is now in progress. Tap End when the work is done.`,
          });
        },
        onError: (error) => {
          const title = error instanceof TaskActionError ? error.title : 'Failed to Start Task';
          Alert.alert(title, error.message || 'Unknown error');
          if (title === 'Task Already Started') {
            setStartTarget(null);
            refresh();
          }
        },
      }
    );
  };

  const runStartInstallation = useCallback(
    async (row: Row, key: string) => {
      setBusyKey(key);
      try {
        await startInstallation(row.uuid);
        await refresh();
        setSuccess({
          title: 'Installation Started',
          message: `${row.accName || 'The installation'} is now in progress. Tap End Installation when the work is done.`,
        });
      } catch (e) {
        Alert.alert('Failed to Start Installation', getErrorMessage(e, 'Unknown error'));
      } finally {
        setBusyKey(null);
      }
    },
    [refresh]
  );

  const onAction = useCallback(
    (row: Row, kind: TaskKind, action: TaskAction, key: string) => {
      const uuid = String(row.uuid ?? '');
      if (!uuid) return;

      if (kind === 'installation') {
        if (action === 'end') {
          router.push({ pathname: '/installations/[uuid]/end', params: { uuid } });
          return;
        }
        const message = `Are you sure you want to start this installation?\n\n${row.accName ?? ''}${
          row.iteCode ? ` · ${row.iteCode}` : ''
        }`;
        if (Platform.OS === 'web') {
          runStartInstallation(row, key);
          return;
        }
        Alert.alert('Start Installation?', message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start', onPress: () => runStartInstallation(row, key) },
        ]);
        return;
      }

      if (action === 'end') {
        router.push({
          pathname: '/tasks/[uuid]/end',
          params: {
            uuid,
            endTaskUuid: row.taskinitiated ?? '',
            kind,
            ...(kind === 'tickets' ? { closeStatus: '010' } : {}),
          },
        });
        return;
      }
      setStartTarget({ row, kind, key });
    },
    [router, runStartInstallation]
  );

  // Switch tab when another screen links here with `?tab=` (e.g. Dashboard → Open Requests).
  const [lastTabParam, setLastTabParam] = useState<string | undefined>(undefined);
  if (params.tab !== lastTabParam) {
    setLastTabParam(params.tab);
    if (params.tab === 'tickets' || params.tab === 'installation' || params.tab === 'services') {
      setTab(params.tab);
    }
  }

  useEffect(() => {
    getPinnedTasks()
      .then((keys: string[] | null) => setPinned(keys ?? []))
      .catch(() => {});
  }, []);

  const onTogglePin = useCallback(async (key: string) => {
    setPinned((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    try {
      await togglePinnedTask(key);
    } catch {
      // Local-only preference; ignore storage failures.
    }
  }, []);

  const source = tab === 'services' ? services : tab === 'tickets' ? tickets : installations;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fields = tab === 'tickets' ? [...SEARCH_FIELDS, 'complaintType'] : SEARCH_FIELDS;
    const filtered = source.filter((row) => {
      if (term) {
        const hit = fields.some((field) =>
          String(row[field] ?? '').toLowerCase().includes(term)
        );
        if (!hit) return false;
      }
      if (dateFilter === 'started') return isStarted(row, tab);
      if (dateFilter === 'today') return isSameDay(filterDate(row, tab), new Date());
      if (dateFilter === 'week') {
        const days = daysUntil(filterDate(row, tab));
        return days !== null && days >= 0 && days <= 6;
      }
      return true;
    });
    return sortByPinned(filtered, pinned) as Row[];
  }, [source, search, dateFilter, tab, pinned]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) return <LoadingView label="Loading your tasks…" />;

  return (
    <View style={styles.flex}>
      <FlatList
        style={styles.flex}
        data={visible}
        keyExtractor={(item, index) => `${getTaskKey(item) || item.uuid || 'row'}-${index}`}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View>
              <Text style={styles.title}>My Tasks</Text>
              <Text style={styles.subtitle}>Services, tickets and installations assigned to you</Text>
            </View>

            {error ? <ErrorBanner error={error} onRetry={onRefresh} /> : null}
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'services', label: 'Services', count: services.length },
                { value: 'tickets', label: 'Tickets', count: tickets.length },
                { value: 'installation', label: 'Install', count: installations.length },
              ]}
            />
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search customer, asset, area…"
            />
            <View style={styles.filters}>
              {DATE_FILTERS.map((filter) => {
                const active = filter.value === dateFilter;
                return (
                  <Pressable
                    key={filter.value}
                    onPress={() => setDateFilter(filter.value)}
                    style={[styles.filter, active && styles.filterActive]}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={onRefresh} style={styles.refreshButton}>
  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
    {refreshing ? (
      <ActivityIndicator size="small" color={colors.primary} />
    ) : (
      <Feather name="rotate-cw" size={20} color={colors.primary} />
    )}
    <Text style={{color: colors.primary, fontSize: fontSize.sm, fontFamily: fonts.medium}}>
      Refresh
    </Text>
  </View>
</Pressable>
            </View>
            
            <Text style={styles.count}>
              Showing {visible.length} of {source.length}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="clipboard"
            title={search || dateFilter !== 'all' ? 'No matching tasks' : 'All clear!'}
            subtitle={
              search || dateFilter !== 'all' ? 'Try a different search or filter.' : EMPTY_COPY[tab]
            }
          />
        }
        renderItem={({ item }) => {
          const key = getTaskKey(item) || item.uuid;
          return (
            <TaskCard
              task={item}
              kind={tab}
              statusList={statusQuery.data}
              ticketStatusList={ticketStatusQuery.data}
              installationStatusList={installationStatusQuery.data}
              pinned={pinned.includes(key)}
              busy={busyKey === key}
              onTogglePin={key ? () => onTogglePin(key) : undefined}
              onAction={(action) => onAction(item, tab, action, key)}
            />
          );
        }}
      />
      <StartTaskModal
        task={startTarget?.row ?? null}
        kindLabel={startTarget?.kind === 'tickets' ? 'ticket' : 'task'}
        loading={startMutation.isPending}
        onCancel={() => setStartTarget(null)}
        onConfirm={confirmStart}
      />

      {/* Success sheet → auto-dismisses back to My Tasks (Alert does nothing on web). */}
      <SuccessModal
        visible={!!success}
        title={success?.title ?? ''}
        message={success?.message ?? ''}
        actionLabel="Done"
        autoCloseMs={SUCCESS_AUTO_CLOSE_MS}
        onAction={() => setSuccess(null)}
      />
    </View>
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
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xxl,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 2,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filter: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  filterTextActive: {
    color: colors.surface,
  },
  count: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
refreshButton: {
    padding: 8,
  },
});
