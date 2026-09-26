/**
 * Shared task / service / ticket utilities.
 *
 * Ported from the web app (`src/components/technician/serviceUtils.js`) so the
 * mobile app drives every Start / End / Cancel button from exactly the same
 * rules. Spec references: §6.3, §6.9, §10.1, §10.3, §10.5.
 */

import { colors } from '../theme';
import { hasText, isSentinelUuid, pad3, pickField, pickText } from './apiHelpers';
import { daysUntil, parseApiDate, toIsoDate } from './format';

/** `GET /api/PMSchedule/getservicestatus` — fallback when the lookup fails. */
export const SERVICE_STATUS_FALLBACK = [
  { code: '000', description: 'Pending' },
  { code: '001', description: 'Initiated' },
  { code: '004', description: 'Completed' },
  { code: '010', description: 'Close' },
];

/** `GET /api/PMSchedule/supportticketstatus` — object map from the backend. */
export const SUPPORT_TICKET_STATUSES = {
  '001': 'Open',
  '002': 'Waiting for Parts',
  '003': 'Replace Asset and Close',
  '010': 'Close',
};

/** Ticket close options offered next to the *End* button. */
export const TICKET_CLOSE_OPTIONS = [
  { code: '010', label: 'Close' },
  { code: '003', label: 'Replace Asset and Close' },
];

/** `GET /api/Annexure/installation/Installationstatus` — fallback table. */
export const INSTALLATION_STATUS_FALLBACK = [
  { code: '000', description: 'Pending' },
  { code: '001', description: 'Instalation Intiated' },
  { code: '002', description: 'Instalation Started' },
  { code: '003', description: 'Instalation Pending for Products' },
  { code: '004', description: 'Cancelled' },
  { code: '005', description: 'Instalation Done' },
  { code: '010', description: 'Instalation Verified' },
];

/** Installation rows in these phases never show in the technician tab. */
export const INSTALLATION_DONE_STATUSES = ['004', '005', '010'];
export const INSTALLATION_STARTABLE_STATUSES = ['001', '004', '010'];
export const INSTALLATION_ENDABLE_STATUSES = ['002'];

/** A PM record in these states can be started (or re-started next cycle). */
export const SERVICE_STARTABLE_STATUSES = ['000', '004', '010'];

export const COMPLAINT_TYPES = {
  '001': 'Installation',
  '002': 'Service',
  '003': 'Complaint',
  '004': 'Re Location',
};

export const COMPLAINT_PRIORITIES = {
  '001': 'Emergency',
  '002': 'High',
  '003': 'Medium',
  '004': 'Normal',
};

export const TASK_STATUS_VALUES = ['Done', 'Pending', 'Cancelled'];

/** Section themes per screen, mirroring the web card themes. */
export const CARD_THEMES = {
  tasks: { accent: colors.primary, soft: colors.primarySoft, tint: '#eff6ff' },
  services: { accent: colors.skyDark, soft: colors.skySoft, tint: '#f0f9ff' },
  requests: { accent: colors.amberDark, soft: colors.amberSoft, tint: '#fffbeb' },
  installation: { accent: colors.purple, soft: colors.purpleSoft, tint: '#f5f3ff' },
  history: { accent: colors.emeraldDark, soft: colors.emeraldSoft, tint: '#ecfdf5' },
  pettyCash: { accent: colors.primaryDark, soft: colors.primarySoft, tint: '#eff6ff' },
};

const STATUS_STYLES = {
  '000': { color: colors.amberDark, background: colors.amberSoft },
  '001': { color: colors.skyDark, background: colors.skySoft },
  '002': { color: '#6d28d9', background: colors.purpleSoft },
  '003': { color: colors.slateDark, background: colors.slateSoft },
  '004': { color: colors.emeraldDark, background: colors.emeraldSoft },
  '005': { color: colors.slateDark, background: colors.slateSoft },
  '006': { color: colors.orange, background: colors.orangeSoft },
  '007': { color: colors.orange, background: colors.orangeSoft },
  '008': { color: colors.orange, background: colors.orangeSoft },
  '009': { color: colors.orange, background: colors.orangeSoft },
  '010': { color: colors.emeraldDark, background: colors.emeraldSoft },
};

/**
 * Normalises `getservicestatus` (array of `g_trccode`/`g_description`) into
 * `[{ code, description }]`. Also accepts `{code, description}` rows and a
 * plain object map such as `{ "001": "Open" }`.
 */
export function normalizeStatusList(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((row) => ({
        code: pad3(pickField(row, ['g_trccode', 'trcCode', 'code', 'Code', 'value']) ?? ''),
        description: pickText(
          row,
          ['g_description', 'description', 'Description', 'label', 'name'],
          ''
        ),
      }))
      .filter((row) => row.code);
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([code, description]) => ({
      code: pad3(code),
      description: String(description ?? ''),
    }));
  }
  return [];
}


/** Status code for a service/task row (or a ticket when `ticket` is true). */
export function getStatusCode(row, { ticket = false } = {}) {
  const keys = ticket
    ? ['complaintStatus', 'ComplaintStatus', 'status', 'Status']
    : [
        'serviceStatus',
        'ServiceStatus',
        'scheduleStatus',
        'ScheduleStatus',
        'schedule_Status',
        'status',
        'Status',
        'complaintStatus',
      ];
  const raw = pickField(row, keys);
  if (raw === undefined) return '';
  return pad3(raw);
}

/**
 * Badge metadata: label from the live lookup (or the built-in fallback) plus
 * colours per spec §10.1.
 */
export function getStatusMeta(code, statusList, fallbackTable = SERVICE_STATUS_FALLBACK) {
  const normalized = pad3(code);
  const table = statusList && statusList.length ? statusList : fallbackTable;
  const entry =
    table.find((item) => item.code === normalized) ??
    fallbackTable.find((item) => item.code === normalized);
  const style = STATUS_STYLES[normalized] ?? {
    color: colors.slateDark,
    background: colors.slateSoft,
  };
  return {
    code: normalized,
    label: entry?.description || `Status ${normalized || '—'}`,
    ...style,
  };
}

/** Status label for a support ticket, whose table is an object map. */
export function getTicketStatusMeta(code, ticketStatusList) {
  // New tickets arrive as `000`, which the backend lookup does not list.
  const table = { '000': 'Pending', ...SUPPORT_TICKET_STATUSES, ...(ticketStatusList ?? {}) };
  const rows = Object.entries(table).map(([key, value]) => ({
    code: pad3(key),
    description: String(value),
  }));
  return getStatusMeta(code, rows, []);
}

/** Installation status badge (uses the annexure lookup when available). */
export function getInstallationStatusMeta(code, installationStatusList) {
  const rows = Array.isArray(installationStatusList) ? installationStatusList : [];
  return getStatusMeta(code, rows, INSTALLATION_STATUS_FALLBACK);
}

export function getComplaintTypeLabel(code) {
  return COMPLAINT_TYPES[pad3(code)] ?? '';
}

export function getComplaintPriorityLabel(code) {
  return COMPLAINT_PRIORITIES[pad3(code)] ?? '';
}

/** `taskinitiated` is a real GUID only after a successful start. */
export function isTaskInitiated(row) {
  if (!row) return false;
  return !isSentinelUuid(pickField(row, ['taskinitiated', 'taskInitiated', 'TaskInitiated']));
}

/** The visit id returned by `starttask` — null while still pending. */
export function getTaskInitiatedId(row) {
  if (!row) return null;
  const value = pickField(row, ['taskinitiated', 'taskInitiated', 'TaskInitiated']);
  return isSentinelUuid(value) ? null : String(value);
}

/** Tickets carry complaint fields instead of a `serviceStatus`. */
export function isSupportTicket(row) {
  if (!row) return false;
  const serviceType = String(pickField(row, ['ServiceType', 'serviceType']) ?? '').toLowerCase();
  if (serviceType === 'service request') return true;
  return Boolean(
    pickField(row, [
      'complaintStatus',
      'complaintType',
      'complaintDt',
      'complaintPriority',
      'comRecvBy',
    ])
  );
}

/**
 * Task phase that drives every action button (spec §10.5).
 *
 * @returns {'pending'|'started'|'closed'}
 */
export function getTaskPhase(row) {
  if (!row) return 'pending';

  if (isSupportTicket(row)) {
    const ticketCode = getStatusCode(row, { ticket: true });
    if (ticketCode === '010') return 'closed';
    if (ticketCode === '001' || isTaskInitiated(row)) return 'started';
    return 'pending';
  }

  const code = getStatusCode(row);
  // A completed/closed PM record is startable again for its next cycle, and
  // this check has to win over everything else.
  if (code === '004' || code === '010') return 'pending';

  const scheduleStatus = String(
    pickField(row, ['schedule_Status', 'scheduleStatus', 'ScheduleStatus']) ?? ''
  ).toLowerCase();
  const closedOn = pickField(row, ['closedOn', 'ClosedOn', 'closed_On']);
  if (scheduleStatus === '010' || scheduleStatus === 'closed' || hasText(closedOn)) return 'closed';

  if (code === '001' || isTaskInitiated(row)) return 'started';
  if (code === '000') return 'pending';
  return isTaskInitiated(row) ? 'started' : 'pending';
}


/** Installation phase (spec §10.5). Installations use `status`/`installationstatus`. */
export function getInstallationPhase(row) {
  if (!row) return 'pending';
  const code = pad3(pickField(row, ['status', 'installationstatus', 'installationStatus']) ?? '');
  if (INSTALLATION_DONE_STATUSES.includes(code)) return 'done';
  const startedAt = pickField(row, [
    'installationStDate',
    'installationStartDate',
    'installationSt_Date',
  ]);
  if (code === '002' || hasText(startedAt)) return 'started';
  return 'pending';
}

export function isInstallationDone(row) {
  return getInstallationPhase(row) === 'done';
}

/* ------------------------------------------------------------------ *
 * Normalisers (dual-casing fallbacks, spec §10.3)
 * ------------------------------------------------------------------ */

/** Stable identity used for de-duplication: `uuid || schVrno || vrNo`. */
export function getTaskKey(row) {
  if (!row) return '';
  const value = pickField(row, ['uuid', 'Uuid', 'schVrno', 'schVr_No', 'vrNo', 'VrNo']);
  return value === undefined ? '' : String(value);
}

/** Canonical service/task/ticket shape used by the cards and detail screens. */
export function normalizeTask(row) {
  if (!row) return null;
  const ticket = isSupportTicket(row);
  return {
    ...row,
    raw: row,
    isSupportTicket: ticket,
    uuid: pickText(row, ['uuid', 'Uuid', 'schVrno', 'schVr_No']),
    schVrno: pickText(row, ['schVrno', 'schVr_No', 'schVrNo']),
    vrNo: pickField(row, ['vrNo', 'VrNo', 'vrno']) ?? '',
    accCode: pickText(row, ['accCode', 'AccCode', 'acc_code']),
    accName: pickText(row, ['accName', 'AccName', 'acc_name'], 'Customer'),
    contactPerson: pickText(row, [
      'contactPerson',
      'ContactPerson',
      'contactperson',
      'comRecvBy',
      'attendeeName',
      'attendeename',
    ]),
    mobileNo: pickText(row, ['mobileNo', 'MobileNo', 'mob1', 'Mob1', 'mobNo', 'comRecvMobNo']),
    email: pickText(row, ['email', 'Email', 'EmailId']),
    assetCode: pickText(row, ['assetCode', 'AssetCode', 'asset_code']),
    assetName: pickText(row, ['assetName', 'AssetName', 'asset_name']),
    commodityName: pickText(row, ['commodityName', 'CommodityName']),
    itemCode: pickText(row, ['iteCode', 'ite_Code', 'itemCode', 'IteCode']),
    itemName: pickText(row, ['iteName', 'ite_Name', 'itemName']),
    zoneName: pickText(row, ['zoneName', 'ZoneName', 'zonetechname', 'iZoneName']),
    areaName: pickText(row, ['areaName', 'AreaName', 'annexureArea']),
    branchName: pickText(row, ['branchName', 'BranchName']),
    streetName: pickText(row, ['streetName', 'StreetName']),
    auxAddress: pickText(row, ['auxAddress', 'AuxAddress']),
    annexureArea: pickText(row, ['annexureArea', 'AnnexureArea']),
    annexureStreetCode: pickText(row, ['annexureStreetCode', 'AnnexureStreetCode']),
    landmark: pickText(row, ['landmark', 'Landmark']),
    serviceStatus: getStatusCode(row, { ticket }),
    scheduleStatus: pickText(row, ['schedule_Status', 'scheduleStatus', 'ScheduleStatus']),
    complaintStatus: pickText(row, ['complaintStatus', 'ComplaintStatus']),
    complaintType: pickText(row, ['complaintType', 'ComplaintType']),
    complaintPriority: pickText(row, ['complaintPriority', 'ComplaintPriority']),
    comRecvBy: pickText(row, ['comRecvBy', 'comRecvName']),
    comRecvDesig: pickText(row, ['comRecvDesig', 'comRecvDesignation']),
    comRecvMobNo: pickText(row, ['comRecvMobNo', 'comRecvMobileNo']),
    closedOn: pickField(row, ['closedOn', 'ClosedOn', 'closed_On']) ?? null,
    closedBy: pickText(row, ['closedBy', 'ClosedBy']),
    serviceNo: pickField(row, ['serviceNo', 'ServiceNo']) ?? '',
    serviceDate: pickField(row, ['serviceDate', 'service_Date', 'svcDate', 'vrDate']) ?? null,
    scheduleDate: pickField(row, ['schedule_Date', 'scheduleDate', 'ScheduleDate']) ?? null,
    updatedDate: pickField(row, ['updated_Date', 'updatedDate']) ?? null,
    lastServiceDate: pickField(row, ['lastServiceDate', 'LastServiceDate']) ?? null,
    nextServiceDate: pickField(row, ['nextServiceDate', 'NextServiceDate']) ?? null,
    installationDate: pickField(row, ['installationDate', 'InstallationDate']) ?? null,
    installationStatus: pad3(
      pickField(row, ['installationstatus', 'installationStatus', 'InstallationStatus']) ?? ''
    ),
    techId: pickText(row, ['techId', 'tech_id', 'TechId', 'tech_Id']),
    taskinitiated: getTaskInitiatedId(row),
    notes: pickText(row, ['notes', 'Notes']),
    annexureNotes: pickText(row, ['annexureNotes', 'AnnexureNotes']),
    attendeeName: pickText(row, ['attendeeName', 'attendeename', 'AttendeeName']),
    attendeeMobNo: pickText(row, ['attendeeMobNo', 'attendeemobno', 'AttendeeMobNo']),
    unitRemove: pickField(row, ['unitRemove', 'UnitRemove']) ?? null,
    unitInstall: pickField(row, ['unitInstall', 'UnitInstall']) ?? null,
    pmMode: Number(pickField(row, ['pmMode', 'pm_Mode']) ?? 0) || 0,
  };
}


/**
 * `auxAddress, annexureArea, branchName, annexureStreetCode, streetName,
 * zoneName` — de-duplicated, empty parts dropped (spec §6.3).
 */
export function buildAddress(row) {
  if (!row) return '';
  const parts = [
    pickText(row, ['auxAddress', 'AuxAddress']),
    pickText(row, ['annexureArea', 'AnnexureArea', 'areaName', 'AreaName']),
    pickText(row, ['branchName', 'BranchName']),
    pickText(row, ['annexureStreetCode', 'AnnexureStreetCode']),
    pickText(row, ['streetName', 'StreetName']),
    pickText(row, ['zoneName', 'ZoneName', 'zonetechname']),
  ].filter(hasText);
  return Array.from(new Set(parts)).join(', ');
}

/**
 * Effective next-service date: the explicit field when present, otherwise
 * `lastServiceDate + pmMode` days (drives the §6.3 date filter).
 */
export function effectiveNextServiceDate(row) {
  if (!row) return null;
  const explicit = parseApiDate(pickField(row, ['nextServiceDate', 'NextServiceDate']));
  if (explicit) return explicit;
  const last = parseApiDate(
    pickField(row, ['lastServiceDate', 'LastServiceDate', 'serviceDate', 'service_Date', 'vrDate'])
  );
  const pmMode = Number(pickField(row, ['pmMode', 'pm_Mode']) ?? 0) || 0;
  if (last && pmMode > 0) {
    const next = new Date(last);
    next.setDate(next.getDate() + pmMode);
    return next;
  }
  return null;
}

/** Chip copy for the next-service-due badge. */
export function getNextServiceDueMeta(row) {
  const next = effectiveNextServiceDate(row);
  if (!next) return null;
  const remaining = daysUntil(next);
  if (remaining === null) return null;
  if (remaining < 0) {
    return { label: `Overdue by ${Math.abs(remaining)}d`, tone: 'danger', date: next };
  }
  if (remaining === 0) return { label: 'Due today', tone: 'warning', date: next };
  return { label: `Due in ${remaining}d`, tone: 'info', date: next };
}




/* ------------------------------------------------------------------ *
 * Installations
 * ------------------------------------------------------------------ */

/** Normalises an annexure installation row (spec §8.4). */
export function normalizeInstallation(row) {
  if (!row) return null;
  const status = pad3(
    pickField(row, ['status', 'installationstatus', 'installationStatus', 'Status']) ?? ''
  );
  return {
    ...row,
    raw: row,
    uuid: pickText(row, ['uuid', 'Uuid']),
    iteCode: pickText(row, ['iteCode', 'ite_Code', 'itemCode', 'IteCode']),
    iteName: pickText(row, ['iteName', 'ite_Name', 'itemName']),
    assetCode: pickText(row, ['assetCode', 'AssetCode', 'asset_code']),
    assetName: pickText(row, ['assetName', 'AssetName', 'asset_name']),
    assetGroup: pickText(row, ['assetGroup', 'AssetGroup']),
    accCode: pickText(row, ['accCode', 'AccCode', 'acc_code']),
    accName: pickText(row, ['accName', 'AccName', 'acc_name'], 'Customer'),
    contactPerson: pickText(row, ['contactPerson', 'ContactPerson']),
    mobileNo: pickText(row, ['mobileNo', 'MobileNo', 'mob1', 'Mob1']),
    mob2: pickText(row, ['mob2', 'Mob2']),
    email: pickText(row, ['email', 'Email']),
    landmark: pickText(row, ['landmark', 'Landmark']),
    branchName: pickText(row, ['branchName', 'BranchName']),
    streetName: pickText(row, ['streetName', 'StreetName']),
    areaName: pickText(row, ['areaName', 'AreaName', 'annexureArea']),
    zoneName: pickText(row, ['zoneName', 'ZoneName', 'zonetechname', 'iZoneName']),
    assetLocation: pickText(row, ['assetLocation', 'AssetLocation']),
    notes: pickText(row, ['notes', 'Notes']),
    techId: pickText(row, ['techId', 'tech_id', 'TechId']),
    installationDate: pickField(row, ['installationDate', 'InstallationDate']) ?? null,
    installationStDate:
      pickField(row, ['installationStDate', 'installationStartDate', 'InstallationStDate']) ?? null,
    hiredOn: pickField(row, ['hiredOn', 'HiredOn']) ?? null,
    status,
    fyCode: pickText(row, ['fyCode', 'FyCode']),
    trcCode: pickText(row, ['trcCode', 'TrcCode']),
    vrNo: Number(pickField(row, ['vrNo', 'VrNo']) ?? 0) || 0,
    slNo: Number(pickField(row, ['slNo', 'SlNo']) ?? 0) || 0,
    pmMode: Number(pickField(row, ['pmMode', 'pm_Mode']) ?? 0) || 0,
    iteQty: Number(pickField(row, ['iteQty', 'IteQty']) ?? 0) || 1,
    iteCapacity: pickText(row, ['iteCapacity', 'IteCapacity'], '001'),
    itePlan: pickText(row, ['itePlan', 'ItePlan']),
    tdsBefore: pickField(row, ['tds_Bf', 'tdsBf', 'Tds_Bf']) ?? '',
    tdsAfter: pickField(row, ['tds_Af', 'tdsAf', 'Tds_Af']) ?? '',
    swBefore: pickField(row, ['sw_bf', 'swBf', 'Sw_bf']) ?? '',
    swAfter: pickField(row, ['sw_af', 'swAf', 'Sw_af']) ?? '',
    waterSource: pickText(row, ['water_source', 'waterSource', 'Water_source']),
  };
}

/**
 * Merge rule (§6.3): the task-list row wins wherever it has a value; the
 * annexure record only fills the blanks.
 */
export function mergeInstallationRows(taskRow, annexureRow) {
  const primary = normalizeInstallation(taskRow);
  const secondary = annexureRow ? normalizeInstallation(annexureRow) : null;
  if (!primary) return secondary;
  if (!secondary) return primary;
  const merged = { ...primary };
  Object.entries(secondary).forEach(([key, value]) => {
    if (key === 'raw') return;
    const current = merged[key];
    if (current === undefined || current === null || current === '') merged[key] = value;
  });
  return merged;
}

/** Blank owner ⇒ keep the row (spec §6.3 installation filtering). */
export function matchesTechnicianOwner(row, { techId, apiUsername } = {}) {
  const owner = String(
    pickField(row, [
      'techId',
      'tech_id',
      'TechId',
      'tech_Id',
      'apiUsername',
      'userName',
      'username',
    ]) ?? ''
  )
    .trim()
    .toLowerCase();
  if (!owner) return true;
  const candidates = [techId, apiUsername]
    .filter(hasText)
    .map((value) => String(value).trim().toLowerCase());
  if (!candidates.length) return true;
  return candidates.includes(owner);
}

/* ------------------------------------------------------------------ *
 * Tasks list helpers
 * ------------------------------------------------------------------ */

export function dedupeByKey(list = []) {
  const seen = new Set();
  const result = [];
  list.forEach((row) => {
    const key = getTaskKey(row);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(row);
  });
  return result;
}

/** Pinned rows sort to the top, everything else keeps API order. */
export function sortByPinned(list = [], pinnedKeys = []) {
  if (!pinnedKeys.length) return list;
  const pinned = new Set(pinnedKeys);
  return [...list].sort((a, b) => {
    const aPinned = pinned.has(getTaskKey(a)) ? 0 : 1;
    const bPinned = pinned.has(getTaskKey(b)) ? 0 : 1;
    return aPinned - bPinned;
  });
}

/**
 * Which UUID ends the visit (spec §6.5 — this exact order):
 * 1. `taskinitiated` from the row, 2. the value handed over by the task list,
 * 3. the schedule uuid as a last resort.
 */
export function resolveEndTaskUuid(task, endTaskUuidFromRoute) {
  const fromTask = getTaskInitiatedId(task);
  if (fromTask) return fromTask;
  if (hasText(endTaskUuidFromRoute)) return String(endTaskUuidFromRoute);
  return pickText(task, ['uuid', 'Uuid', 'schVrno', 'schVr_No']);
}

/** UUID used by `starttask` / `canceltask`: `uuid || schVrno || vrNo`. */
export function getScheduleUuid(task) {
  return pickText(task, ['uuid', 'Uuid', 'schVrno', 'schVr_No', 'vrNo', 'VrNo']);
}

/* ------------------------------------------------------------------ *
 * Service history (`/api/customers/getserivehistory/{techId}`)
 * ------------------------------------------------------------------ */

export function normalizeHistoryRecord(row) {
  if (!row) return null;
  const serviceType = pickText(row, ['ServiceType', 'serviceType', 'service_type'], 'Service');
  return {
    ...row,
    raw: row,
    uuid: pickText(row, ['uuid', 'Uuid']),
    accCode: pickText(row, ['accCode', 'AccCode', 'acc_code']),
    accName: pickText(row, ['accName', 'AccName', 'acc_name'], 'Customer'),
    serviceDate: pickField(row, ['serviceDate', 'service_date', 'ServiceDate']) ?? null,
    attendeeName: pickText(row, ['attendeeName', 'attendeename', 'Attendeename']),
    attendeeMobNo: pickText(row, ['attendeeMobNo', 'attendeemobno', 'Attendeemobno']),
    attendeeNotes: pickText(row, ['attendeeNotes', 'attendeenotes', 'Attendeenotes']),
    techId: pickText(row, ['techId', 'tech_id', 'TechId']),
    status: pad3(pickField(row, ['pmsrvstatus', 'status', 'Status']) ?? ''),
    taskInitiated: pickField(row, ['TaskInitiated', 'taskInitiated', 'taskinitiated']) ?? null,
    serviceType,
    isTicket: serviceType.toLowerCase() === 'service request',
  };
}

/** Completed rule: ticket ⇒ `010`; service/task ⇒ `010` or `004` (spec §6.9). */
export function isCompletedHistoryRow(record) {
  const normalized = record?.isTicket === undefined ? normalizeHistoryRecord(record) : record;
  if (!normalized) return false;
  if (normalized.isTicket) return normalized.status === '010';
  return normalized.status === '004' || normalized.status === '010';
}

/** Ticket and service status systems differ — pick the right one. */
export function getHistoryStatusMeta(record, statusList, ticketStatusList) {
  const normalized = record?.isTicket === undefined ? normalizeHistoryRecord(record) : record;
  if (!normalized) return getStatusMeta('', statusList);
  return normalized.isTicket
    ? getTicketStatusMeta(normalized.status, ticketStatusList)
    : getStatusMeta(normalized.status, statusList);
}

/** Chip copy for the service-type column (Service / Support Ticket / Task). */
export function getHistoryServiceTypeLabel(record) {
  const normalized = record?.serviceType ? record : normalizeHistoryRecord(record);
  if (!normalized) return 'Service';
  if (normalized.isTicket) return 'Support Ticket';
  if (String(normalized.serviceType).toLowerCase() === 'task') return 'Task';
  return 'Service';
}

/** Groups history rows per day, newest day first (Completed Services screen). */
export function groupHistoryByDay(records = []) {
  const groups = new Map();
  records.forEach((record) => {
    const normalized = normalizeHistoryRecord(record);
    const date = parseApiDate(normalized.serviceDate) ?? parseApiDate(normalized.taskInitiated);
    const key = date ? toIsoDate(date) : 'unknown';
    if (!groups.has(key)) groups.set(key, { key, date, items: [] });
    groups.get(key).items.push(normalized);
  });
  return Array.from(groups.values()).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.getTime() - a.date.getTime();
  });
}


