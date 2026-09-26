/**
 * Card used by My Tasks for services, tickets and installations (spec §6.3).
 *
 * Action rules:
 *  - Services:      serviceStatus `001` ⇒ End, anything else ⇒ Start
 *  - Tickets:       complaintStatus `001` ⇒ End, anything else ⇒ Start
 *  - Installations: pending (not started yet) ⇒ Start, otherwise ⇒ End
 */
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import GradientButton from '@/components/GradientButton';
import { colors, fontSize, radius, shadows, spacing, fonts } from '@/theme';
import { formatDate, formatDateTime, initialsOf } from '@/lib/format';
import { hasText, pad3 } from '@/lib/apiHelpers';
import {
  buildAddress,
  getComplaintPriorityLabel,
  getComplaintTypeLabel,
  getInstallationPhase,
  getInstallationStatusMeta,
  getNextServiceDueMeta,
  getStatusMeta,
  getTicketStatusMeta,
} from '@/lib/serviceUtils';

type Row = Record<string, any>;
type FeatherName = React.ComponentProps<typeof Feather>['name'];
type StatusRow = { code: string; description: string };
export type TaskKind = 'services' | 'tickets' | 'installation';
export type TaskAction = 'start' | 'end';

const THEMES: Record<TaskKind, { accent: string; soft: string; label: string; icon: FeatherName }> = {
  services: { accent: colors.skyDark, soft: colors.skySoft, label: 'Service', icon: 'tool' },
  tickets: { accent: colors.amberDark, soft: colors.amberSoft, label: 'Ticket', icon: 'message-square' },
  installation: { accent: colors.purple, soft: colors.purpleSoft, label: 'Installation', icon: 'package' },
};

const DUE_TONES: Record<string, { color: string; background: string }> = {
  danger: { color: colors.danger, background: colors.dangerSoft },
  warning: { color: colors.warning, background: colors.warningSoft },
  info: { color: colors.info, background: colors.infoSoft },
};

const PRIORITY_TONES: Record<string, { color: string; background: string }> = {
  Emergency: { color: colors.danger, background: colors.dangerSoft },
  High: { color: colors.orange, background: colors.orangeSoft },
  Medium: { color: colors.warning, background: colors.warningSoft },
  Normal: { color: colors.slateDark, background: colors.slateSoft },
};

/** Placeholder values the ERP stores instead of leaving a field blank. */
const PLACEHOLDERS = new Set(['-', 'na', 'n/a', 'nil', 'none', '0']);

function clean(value: unknown) {
  if (!hasText(value)) return '';
  const text = String(value).trim();
  return PLACEHOLDERS.has(text.toLowerCase()) ? '' : text;
}

function cleanPhone(value: unknown) {
  const text = clean(value);
  const digits = text.replace(/[^\d]/g, '');
  // Dummy numbers such as +971000000000000 are not callable.
  if (!digits || /^9710+$/.test(digits) || /^0+$/.test(digits)) return '';
  return text;
}

export function getTaskAction(task: Row, kind: TaskKind): TaskAction {
  if (kind === 'installation') return getInstallationPhase(task) === 'pending' ? 'start' : 'end';
  const code =
    kind === 'tickets'
      ? pad3(task.complaintStatus || task.serviceStatus)
      : pad3(task.serviceStatus);
  return code === '001' ? 'end' : 'start';
}

function Chip({
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
      {icon ? <Feather name={icon} size={11} color={color} /> : null}
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function InfoRow({ icon, label, value, lines = 1 }: {
  icon: FeatherName;
  label: string;
  value: string;
  lines?: number;
}) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={14} color={colors.muted} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={lines}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function IconButton({ icon, color, background, onPress, label }: {
  icon: FeatherName;
  color: string;
  background: string;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: background }, pressed && styles.pressed]}
    >
      <Feather name={icon} size={18} color={color} />
    </Pressable>
  );
}

export default function TaskCard({
  task,
  kind,
  statusList,
  ticketStatusList,
  installationStatusList,
  pinned,
  busy,
  onTogglePin,
  onAction,
}: {
  task: Row;
  kind: TaskKind;
  statusList?: StatusRow[];
  ticketStatusList?: Record<string, string>;
  installationStatusList?: StatusRow[];
  pinned?: boolean;
  busy?: boolean;
  onTogglePin?: () => void;
  onAction?: (action: TaskAction) => void;
}) {
  const theme = THEMES[kind];
  const status =
    kind === 'installation'
      ? getInstallationStatusMeta(task.status, installationStatusList)
      : kind === 'tickets'
        ? getTicketStatusMeta(task.complaintStatus || task.serviceStatus, ticketStatusList)
        : getStatusMeta(task.serviceStatus, statusList);
  const action = getTaskAction(task, kind);

  const title = clean(task.accName) || 'Customer';
  const address = buildAddress(task);
  const phone = cleanPhone(task.mobileNo || task.comRecvMobNo || task.mob1);
  const contact = clean(task.contactPerson || task.comRecvBy);
  const designation = kind === 'tickets' ? clean(task.comRecvDesig) : '';
  const asset = [clean(task.assetCode), clean(task.assetName)].filter(Boolean).join(' · ');
  const item = [clean(task.iteCode), clean(task.iteName)].filter(Boolean).join(' · ');
  const due = kind === 'services' ? getNextServiceDueMeta(task) : null;
  const complaintType = kind === 'tickets' ? getComplaintTypeLabel(task.complaintType) : '';
  const priority = kind === 'tickets' ? getComplaintPriorityLabel(task.complaintPriority) : '';
  const details = kind === 'tickets' ? clean(task.comDetails) : clean(task.notes);

  const reference =
    kind === 'tickets'
      ? hasText(task.vrNo) ? `#${task.vrNo}` : ''
      : kind === 'services'
        ? hasText(task.serviceNo) ? `Service #${task.serviceNo}` : ''
        : hasText(task.vrNo) && task.vrNo ? `VR #${task.vrNo}` : '';

  const dateRow =
    kind === 'services'
      ? { label: 'Next service', value: formatDate(task.nextServiceDate) || formatDate(due?.date) }
      : kind === 'tickets'
        ? { label: 'Reported', value: formatDateTime(task.complaintDt || task.vrDate) }
        : { label: 'Installation date', value: formatDate(task.installationDate) };
  const lastService = kind === 'services' ? formatDate(task.lastServiceDate) : '';

  const isStart = action === 'start';
  const actionLabel = isStart
    ? kind === 'installation' ? 'Start Installation' : 'Start Task'
    : kind === 'installation' ? 'End Installation' : kind === 'tickets' ? 'Close Ticket' : 'End Task';

  return (
    <View style={styles.card}>
      {/* Coloured type strip */}
      <View style={[styles.strip, { backgroundColor: theme.soft }]}>
        <View style={styles.stripLeft}>
          <Feather name={theme.icon} size={13} color={theme.accent} />
          <Text style={[styles.stripText, { color: theme.accent }]}>{theme.label}</Text>
          {reference ? <Text style={[styles.stripRef, { color: theme.accent }]}>{reference}</Text> : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.background }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Customer */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>{initialsOf(title)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {[clean(task.accCode), clean(task.zoneName) || clean(task.commodityName)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          {onTogglePin ? (
            <Pressable
              onPress={onTogglePin}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={pinned ? 'Unpin task' : 'Pin task'}
              style={[styles.pin, pinned && styles.pinActive]}
            >
              <AntDesign name="pushpin" size={18} color={pinned ? colors.primary : colors.faint} />
            </Pressable>
          ) : null}
        </View>

        {/* Tags */}
        {complaintType || priority || due || kind === 'services' ? (
          <View style={styles.chips}>
            {kind === 'services' && clean(task.commodityName) && clean(task.zoneName) ? (
              <Chip label={clean(task.commodityName)} icon="droplet" />
            ) : null}
            {complaintType ? <Chip label={complaintType} icon="tag" /> : null}
            {priority ? (
              <Chip
                label={`${priority} priority`}
                icon="alert-circle"
                color={PRIORITY_TONES[priority]?.color}
                background={PRIORITY_TONES[priority]?.background}
              />
            ) : null}
            {due ? (
              <Chip
                label={due.label}
                icon="clock"
                color={DUE_TONES[due.tone].color}
                background={DUE_TONES[due.tone].background}
              />
            ) : null}
          </View>
        ) : null}

        {/* Complaint / notes */}
        {details ? (
          <View style={[styles.quote, { borderLeftColor: theme.accent, backgroundColor: theme.soft }]}>
            <Text style={styles.quoteText} numberOfLines={3}>
              {details}
            </Text>
          </View>
        ) : null}

        {/* Details */}
        <View style={styles.infoBox}>
          <InfoRow icon="cpu" label={kind === 'installation' ? 'Item' : 'Asset'} value={kind === 'installation' ? item || asset : asset} />
          {kind === 'installation' && asset && item ? <InfoRow icon="hash" label="Asset" value={asset} /> : null}
          <InfoRow icon="calendar" label={dateRow.label} value={dateRow.value} />
          <InfoRow icon="rotate-ccw" label="Last service" value={lastService} />
          <InfoRow icon="map-pin" label="Address" value={address} lines={2} />
          <InfoRow
            icon="user"
            label="Contact"
            value={[contact, designation].filter(Boolean).join(' · ')}
          />
        </View>

        {/* Actions */}
        <View style={styles.footer}>
          {phone ? (
            <IconButton
              icon="phone"
              label={`Call ${phone}`}
              color={colors.emeraldDark}
              background={colors.emeraldSoft}
              onPress={() => Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`)}
            />
          ) : null}
          {address || /^https?:\/\//i.test(String(task.landmark ?? '')) ? (
            <IconButton
              icon="navigation"
              label="Open in maps"
              color={colors.primary}
              background={colors.primarySoft}
              onPress={() =>
                Linking.openURL(
                  /^https?:\/\//i.test(String(task.landmark ?? ''))
                    ? String(task.landmark).trim()
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
                )
              }
            />
          ) : null}
          {onAction ? (
            <GradientButton
              label={actionLabel}
              icon={isStart ? 'play' : 'check-square'}
              variant={isStart ? 'start' : 'end'}
              loading={busy}
              onPress={() => onAction(action)}
              compact
              style={styles.flex}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  stripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  stripText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
  },
  stripRef: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    opacity: 0.8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    maxWidth: '55%',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: fontSize.body,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body + 1,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs + 1,
    color: colors.muted,
    marginTop: 2,
  },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  pinActive: {
    backgroundColor: colors.primarySoft,
    transform: [{ rotate: '-20deg' }],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  quote: {
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  quoteText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.ink,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.faint,
  },
  infoValue: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginTop: 1,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
