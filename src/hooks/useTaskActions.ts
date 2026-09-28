/**
 * Start / end task mutations (spec §6.3, §6.5, §9.2, §9.3).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startTask, endTask } from '@/api/technicianApi';
import { getErrorCode, getErrorMessage, isHttpStatus } from '@/lib/apiHelpers';
import { getScheduleUuid, getTaskKey } from '@/lib/serviceUtils';
import {
  clearActiveTask,
  getPinnedTasks,
  saveLastEndTask,
  setActiveTask,
  setPinnedTasks,
} from '@/lib/taskStorage';
import { useTechnicianIdentity, type Row } from './useTechnicianQueries';
import { toUploadPart, toUploadParts } from '@/lib/uploadUtils';
import type { LocalImage } from '@/components/PhotoPicker';

/** A local photo/signature waiting to be uploaded as a multipart file part. */
type FilePart = { uri: string; name: string; type: string };

export class TaskActionError extends Error {
  title: string;
  constructor(title: string, message: string) {
    super(message);
    this.title = title;
  }
}

/** Patch one row inside the cached `tasklistbyteche` response (all list keys). */
function patchMyTasks(data: any, key: string, patch: Row) {
  const patchList = (list: unknown) =>
    Array.isArray(list)
      ? list.map((row: Row) => (getTaskKey(row) === key ? { ...row, ...patch } : row))
      : list;
  if (Array.isArray(data)) return patchList(data);
  if (!data || typeof data !== 'object') return data;
  const next: Row = { ...data };
  ['serviceList', 'serviceRequestList', 'requestList', 'requests'].forEach((k) => {
    if (Array.isArray(next[k])) next[k] = patchList(next[k]);
  });
  return next;
}

export function useStartTask() {
  const queryClient = useQueryClient();
  const { apiUsername } = useTechnicianIdentity();

  return useMutation({
    mutationFn: async ({ task, images }: { task: Row; images: LocalImage[] }) => {
      const scheduleUuid = getScheduleUuid(task);
      // The API expects at least one before-service photo, so fail fast with a clear copy
      // instead of letting the request come back as a generic 400 (spec §6.3).
      if (!images?.length) {
        throw new TaskActionError(
          'Photo Required',
          'Add at least one before-service photo of the asset before starting the task.'
        );
      }
      const fd = new FormData();
      // Photos are compressed before upload; the part value is platform-aware (see uploadUtils).
      (await toUploadParts(images)).forEach((part) =>
        fd.append('AssetImagesBeforeTaskStart', part as any)
      );
      try {
        const res: Row = (await startTask(scheduleUuid, fd)) ?? {};
        const endTaskUuid = String(res.uuid || res.taskUuid || '');
        return { task, scheduleUuid, endTaskUuid };
      } catch (error) {
        if (getErrorCode(error) === 'TASK_ALREADY_PENDING' || isHttpStatus(error, 409)) {
          throw new TaskActionError(
            'Task Already Started',
            'This task has already been started or closed. Please contact your administrator.'
          );
        }
        throw new TaskActionError('Failed to Start Task', getErrorMessage(error, 'Unknown error'));
      }
    },
    onSuccess: async ({ task, scheduleUuid, endTaskUuid }) => {
      await setActiveTask({
        taskUuid: scheduleUuid,
        endTaskUuid,
        taskName: task.accName ?? '',
        startedAt: new Date().toISOString(),
      });

      // Auto-pin the started task so it stays at the top of My Tasks.
      const key = getTaskKey(task);
      if (key) {
        const pins: string[] = (await getPinnedTasks()) ?? [];
        if (!pins.includes(key)) await setPinnedTasks([...pins, key]);
      }

      // Flip the row to "started" now instead of racing the backend write.
      queryClient.setQueryData(['technician', 'myTasks', apiUsername], (data: any) =>
        patchMyTasks(data, key, {
          serviceStatus: '001',
          complaintStatus: '001',
          taskinitiated: endTaskUuid || undefined,
        })
      );
    },
  });
}

export type EndTaskPayload = {
  serviceDate: string;
  techId: string;
  notes: string;
  statusCode: string;
  attendeeName: string;
  attendeeMobNo: string;
  attendeeNotes: string;
  attendeeRating: string;
  tdsBf: string;
  tdsAf: string;
  swBf: string;
  swAf: string;
  waterSource: string;
  afterImages: FilePart[];
  bomItems: { ite_Code: string; ite_Name: string; qty: number; rate: number; tech_Notes: string }[];
  tasks: {
    srNo: number;
    dsrNo: number;
    task_Status: string;
    tech_Notes: string;
    jobCode: string;
    subGroup: string;
    code: string;
    taskTitle: string;
  }[];
  attendeeSignature: FilePart;
  techieSignature: FilePart;
};

export function useEndTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskUuid, payload }: { taskUuid: string; payload: EndTaskPayload }) => {
      // Part order and names follow spec §9.3 exactly.
      const fd = new FormData();
      fd.append('ServiceDate', payload.serviceDate);
      fd.append('TechId', payload.techId);
      fd.append('Notes', payload.notes);
      fd.append('StatusCode', payload.statusCode);
      fd.append('AttendeeName', payload.attendeeName);
      fd.append('AttendeeMobNo', payload.attendeeMobNo);
      fd.append('AttendeeNotes', payload.attendeeNotes);
      fd.append('AttendeeRating', payload.attendeeRating);
      fd.append('Tds_Bf', payload.tdsBf);
      fd.append('Tds_Af', payload.tdsAf);
      fd.append('Sw_bf', payload.swBf);
      fd.append('Sw_af', payload.swAf);
      fd.append('Water_source', payload.waterSource);
      (await toUploadParts(payload.afterImages)).forEach((img) =>
        fd.append('AfterServiceImage', img as any)
      );
      if (payload.bomItems.length) fd.append('BomItemslist', JSON.stringify(payload.bomItems));
      if (payload.tasks.length) fd.append('Taskslist', JSON.stringify(payload.tasks));
      fd.append('AttendeeSignature', (await toUploadPart(payload.attendeeSignature)) as any);
      fd.append('TechieSignature', (await toUploadPart(payload.techieSignature)) as any);

      try {
        return ((await endTask(taskUuid, fd)) ?? {}) as Row;
      } catch (error) {
        throw new TaskActionError('Failed to End Task', getErrorMessage(error, 'Unknown error'));
      }
    },
    onSuccess: async (res: Row, { taskUuid }) => {
      // Only clear the open visit after the server accepted the close (spec §9.3).
      await clearActiveTask();
      await saveLastEndTask({ endTaskUuid: res?.uuid || taskUuid, endedAt: new Date().toISOString() });
      await queryClient.invalidateQueries({ queryKey: ['technician'] });
    },
  });
}
