/**
 * React Query hooks for the technician screens.
 *
 * Query keys match the web app exactly (spec §3) so a single
 * `invalidateQueries({ queryKey: ['technician'] })` refreshes every screen.
 */
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '@/store/authStore';
import {
  getMyTasks,
  getServiceHistory,
  getServiceList,
  getServiceRequests,
  getServiceStatusList,
  getSupportTicketStatusList,
} from '@/api/technicianApi';
import { getInstallationAll, getInstallationStatusList } from '@/api/annexureService';
import { getPettyCashList } from '@/api/pettyCashService';
import { addDays, toIsoDate } from '@/lib/format';
import {
  dedupeByKey,
  isInstallationDone,
  matchesTechnicianOwner,
  mergeInstallationRows,
  normalizeStatusList,
  normalizeTask,
} from '@/lib/serviceUtils';

export type Row = Record<string, any>;

export function useTechnicianIdentity() {
  const profile = useAuthStore((s: any) => s.profile);
  const username = useAuthStore((s: any) => s.username);
  const displayName = useAuthStore((s: any) => s.displayName);
  return {
    techId: (profile?.techId as string | undefined) ?? '',
    apiUsername: (profile?.apiUsername as string | undefined) ?? '',
    displayName: (profile?.displayName ?? displayName ?? '') as string,
    // Petty cash is keyed by the raw login name (spec §6.10).
    rawUsername: (username ?? profile?.apiUsername ?? '') as string,
  };
}

export function useRefreshTechnician() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['technician'] });
}

export function useServiceStatusList() {
  return useQuery({
    queryKey: ['technician', 'serviceStatusList'],
    queryFn: async () => normalizeStatusList(await getServiceStatusList()),
    staleTime: 10 * 60 * 1000,
  });
}

/** `{ "001": "Open", … }` object map, used as-is by getTicketStatusMeta. */
export function useSupportTicketStatusList() {
  return useQuery({
    queryKey: ['technician', 'supportTicketStatusList'],
    queryFn: async () => {
      const data = await getSupportTicketStatusList();
      return data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, string>)
        : {};
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useInstallationStatusList() {
  return useQuery({
    queryKey: ['technician', 'installationStatuses'],
    queryFn: async () => normalizeStatusList(await getInstallationStatusList()),
    staleTime: 10 * 60 * 1000,
  });
}

export function useServiceList() {
  const { apiUsername } = useTechnicianIdentity();
  return useQuery({
    queryKey: ['technician', 'serviceList', apiUsername],
    queryFn: () => getServiceList(apiUsername) as Promise<Row[]>,
    enabled: !!apiUsername,
  });
}

export function useServiceRequests() {
  const { apiUsername } = useTechnicianIdentity();
  return useQuery({
    queryKey: ['technician', 'serviceRequests', apiUsername],
    queryFn: () => getServiceRequests(apiUsername) as Promise<Row[]>,
    enabled: !!apiUsername,
  });
}

/** Raw `tasklistbyteche` response (all three tabs in one payload). */
export function useMyTasksRaw() {
  const { apiUsername } = useTechnicianIdentity();
  return useQuery({
    queryKey: ['technician', 'myTasks', apiUsername],
    queryFn: () => getMyTasks(apiUsername),
    enabled: !!apiUsername,
  });
}

export function useServiceHistory(rangeDays: number) {
  const toDate = toIsoDate(new Date());
  const fromDate = toIsoDate(addDays(new Date(), -(rangeDays - 1)) as Date);
  return useServiceHistoryRange(fromDate, toDate);
}

/** Service history for an explicit `YYYY-MM-DD` range (Completed Services screen). */
export function useServiceHistoryRange(fromDate: string, toDate: string) {
  const { techId } = useTechnicianIdentity();
  return useQuery({
    queryKey: ['technician', 'serviceHistory', techId, fromDate, toDate],
    queryFn: () => getServiceHistory(techId, fromDate, toDate) as Promise<Row[]>,
    enabled: !!techId,
  });
}

export function useAnnexureInstallations() {
  const toDate = toIsoDate(new Date());
  const fromDate = toIsoDate(addDays(new Date(), -59) as Date);
  return useQuery({
    queryKey: ['technician', 'annexureInstallations', fromDate, toDate],
    queryFn: () => getInstallationAll(fromDate, toDate) as Promise<Row[]>,
  });
}

export function usePettyCashList(stDate: string, endDate: string) {
  const { rawUsername } = useTechnicianIdentity();
  return useQuery({
    queryKey: ['technician', 'pettyCash', rawUsername, stDate, endDate],
    queryFn: () => getPettyCashList(rawUsername, stDate, endDate) as Promise<Row[]>,
    enabled: !!rawUsername,
  });
}

/** Splits `tasklistbyteche` into the three My Tasks tabs (spec §6.3). */
export function splitMyTasks(data: any) {
  // A bare array response means the services list only.
  if (Array.isArray(data)) return { services: dedupeByKey(data), tickets: [], installations: [] };
  const pick = (keys: string[]) => {
    for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
    return [];
  };
  const services = dedupeByKey(pick(['serviceList']));
  const tickets = dedupeByKey(
    pick(['serviceRequestList', 'requestList', 'requests']).length
      ? pick(['serviceRequestList', 'requestList', 'requests'])
      : Array.isArray(data?.data?.serviceRequestList)
        ? data.data.serviceRequestList
        : []
  );
  const installations = pick(['instalationList', 'installationList']);
  return { services, tickets, installations };
}

/** My Tasks, normalised and filtered exactly like the web TasksPage. */
export function useMyTasks() {
  const identity = useTechnicianIdentity();
  const tasksQuery = useMyTasksRaw();
  const annexureQuery = useAnnexureInstallations();

  const lists = useMemo(() => {
    const { services, tickets, installations } = splitMyTasks(tasksQuery.data);
    const annexureByUuid = new Map<string, Row>();
    (annexureQuery.data ?? []).forEach((row: Row) => {
      const key = String(row?.uuid ?? row?.Uuid ?? '');
      if (key) annexureByUuid.set(key, row);
    });
    const mergedInstallations = installations
      .map((row: Row) => mergeInstallationRows(row, annexureByUuid.get(String(row?.uuid ?? row?.Uuid ?? ''))))
      .filter(Boolean)
      .filter((row: Row) =>
        matchesTechnicianOwner(row, { techId: identity.techId, apiUsername: identity.apiUsername })
      )
      .filter((row: Row) => !isInstallationDone(row));

    return {
      services: services.map(normalizeTask) as Row[],
      tickets: tickets.map((row: Row) => normalizeTask({ ...row, ServiceType: row.ServiceType ?? 'Service Request' })) as Row[],
      installations: mergedInstallations as Row[],
    };
  }, [tasksQuery.data, annexureQuery.data, identity.techId, identity.apiUsername]);

  return {
    ...lists,
    isLoading: tasksQuery.isLoading,
    isRefetching: tasksQuery.isRefetching || annexureQuery.isRefetching,
    error: tasksQuery.error,
    refetch: () => Promise.all([tasksQuery.refetch(), annexureQuery.refetch()]),
  };
}
