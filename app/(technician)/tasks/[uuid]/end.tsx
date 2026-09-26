/**
 * End Task — spec §6.5 / §9.3.
 *
 * Sections: technician details, attendee details + water readings, after-service photos,
 * parts used (BOM), task checklist, then Submit & End Task. Both signatures are mandatory.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, shadows, spacing, fonts } from '@/theme';
import GradientButton from '@/components/GradientButton';
import PhotoPicker, { type LocalImage } from '@/components/PhotoPicker';
import SignatureField, { type SignatureValue } from '@/components/SignatureField';
import ItemPickerModal, { type Item } from '@/components/ItemPickerModal';
import { DateField } from '@/components/form';
import { ErrorBanner, LoadingView } from '@/components/ui';
import {
  splitMyTasks,
  useTechnicianIdentity,
  type Row,
} from '@/hooks/useTechnicianQueries';
import { TaskActionError, useEndTask } from '@/hooks/useTaskActions';
import { getTaskById } from '@/api/technicianApi';
import { getItemMaster } from '@/api/itemService';
import { hasText, pickText } from '@/lib/apiHelpers';
import {
  TASK_STATUS_VALUES,
  buildAddress,
  getScheduleUuid,
  getTaskKey,
  normalizeTask,
  resolveEndTaskUuid,
} from '@/lib/serviceUtils';
import { getActiveTask } from '@/lib/taskStorage';

type FeatherName = React.ComponentProps<typeof Feather>['name'];
type BomRow = { id: number; code: string; name: string; qty: string; rate: string; notes: string };
type CheckRow = { id: number; title: string; jobCode: string; notes: string; status: string };

/** The status sent with every End Task call — the backend decides the resulting state. */
const END_TASK_STATUS_CODE = '00';

let rowId = 0;
const nextId = () => ++rowId;

/* ------------------------------------------------------------------ *
 * Small form building blocks
 * ------------------------------------------------------------------ */

function Section({
  icon,
  title,
  subtitle,
  step,
  children,
}: {
  icon: FeatherName;
  title: string;
  subtitle?: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Feather name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.sectionStep}>STEP {step}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  style?: object;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        multiline={multiline}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, multiline && styles.inputMultiline, focused && styles.inputFocused]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function ChoiceChips({
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

function StarRating({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityLabel={`${n} stars`}>
          <Text style={[styles.star, n <= value && styles.starActive]}>★</Text>
        </Pressable>
      ))}
      <Text style={styles.starLabel}>{value}/5</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Screen
 * ------------------------------------------------------------------ */

export default function EndTask() {
  const params = useLocalSearchParams<{
    uuid: string;
    endTaskUuid?: string;
    closeStatus?: string;
    kind?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { techId, apiUsername } = useTechnicianIdentity();
  const endTaskMutation = useEndTask();

  // Prefer the row already in the My Tasks cache (spec: avoid a re-fetch), else fetch it.
  const cachedTask = useMemo(() => {
    const data = queryClient.getQueryData(['technician', 'myTasks', apiUsername]);
    const { services, tickets } = splitMyTasks(data);
    return [...services, ...tickets].find(
      (row: Row) => getTaskKey(row) === params.uuid || row.uuid === params.uuid
    );
  }, [queryClient, apiUsername, params.uuid]);

  const taskQuery = useQuery({
    queryKey: ['technician', 'taskById', params.uuid],
    queryFn: () => getTaskById(params.uuid),
    enabled: !cachedTask && !!params.uuid,
  });

  const task: Row | null = useMemo(() => {
    const raw = cachedTask ?? (Array.isArray(taskQuery.data) ? taskQuery.data[0] : taskQuery.data);
    if (!raw) return null;
    return normalizeTask(
      params.kind === 'tickets' ? { ...raw, ServiceType: raw.ServiceType ?? 'Service Request' } : raw
    );
  }, [cachedTask, taskQuery.data, params.kind]);

  const isTicket = params.kind === 'tickets' || !!task?.isSupportTicket;

  const itemsQuery = useQuery({
    queryKey: ['technician', 'itemMaster'],
    queryFn: async () =>
      ((await getItemMaster()) as Row[])
        .map((row) => ({
          code: pickText(row, ['ite_Code', 'iteCode', 'itemCode', 'IteCode']),
          name: pickText(row, ['ite_Name', 'iteName', 'itemName', 'IteName']),
        }))
        .filter((item) => item.code),
    staleTime: 30 * 60 * 1000,
  });

  /* ---------------- form state ---------------- */
  const [serviceDate, setServiceDate] = useState(() => new Date());
  const [notes, setNotes] = useState('');
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeMobNo, setAttendeeMobNo] = useState('');
  const [attendeeNotes, setAttendeeNotes] = useState('');
  const [rating, setRating] = useState(5);
  const [tdsBf, setTdsBf] = useState('');
  const [tdsAf, setTdsAf] = useState('');
  const [swBf, setSwBf] = useState('');
  const [swAf, setSwAf] = useState('');
  const [waterSource, setWaterSource] = useState('');
  const [afterImages, setAfterImages] = useState<LocalImage[]>([]);
  const [bomRows, setBomRows] = useState<BomRow[]>([]);
  const [checkRows, setCheckRows] = useState<CheckRow[]>([]);
  const [techSignature, setTechSignature] = useState<SignatureValue | null>(null);
  const [customerSignature, setCustomerSignature] = useState<SignatureValue | null>(null);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [activeEndUuid, setActiveEndUuid] = useState<string | null>(null);

  // Prefill once the task is known (spec §6.5).
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (task && prefilledFor !== task.uuid) {
    setPrefilledFor(task.uuid);
    setNotes(hasText(task.notes) ? String(task.notes) : '');
    setAttendeeName(task.contactPerson && task.contactPerson.toLowerCase() !== 'na' ? task.contactPerson : '');
    setAttendeeMobNo(task.mobileNo || '');
  }

  // The locally stored active task knows the visit id even after an app restart.
  useEffect(() => {
    getActiveTask()
      .then((active: Row | null) => {
        if (active && (active.taskUuid === params.uuid || active.endTaskUuid === params.endTaskUuid)) {
          setActiveEndUuid(active.endTaskUuid || null);
        }
      })
      .catch(() => {});
  }, [params.uuid, params.endTaskUuid]);

  /* ---------------- BOM / checklist helpers ---------------- */
  const updateBom = (id: number, patch: Partial<BomRow>) =>
    setBomRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const updateCheck = (id: number, patch: Partial<CheckRow>) =>
    setCheckRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  /* ---------------- submit ---------------- */
  const submit = () => {
    if (!task) return;
    if (!customerSignature) {
      Alert.alert('Missing Signature', 'Please provide the attendee signature before ending the task.');
      return;
    }
    if (!techSignature) {
      Alert.alert('Missing Signature', 'Please provide the technician signature before ending the task.');
      return;
    }

    const taskUuid = resolveEndTaskUuid(task, params.endTaskUuid || activeEndUuid) || getScheduleUuid(task);

    const bomItems = bomRows
      .filter((r) => r.code || r.notes.trim())
      .map((r) => ({
        ite_Code: r.code,
        ite_Name: r.name,
        qty: Number(r.qty) || 0,
        rate: Number(r.rate) || 0,
        tech_Notes: r.notes.trim(),
      }));
    const tasks = checkRows
      .filter((r) => r.jobCode.trim() || r.title.trim() || r.notes.trim())
      .map((r, index) => ({
        srNo: index,
        dsrNo: index,
        task_Status: r.status,
        tech_Notes: r.notes.trim(),
        jobCode: r.jobCode.trim(),
        subGroup: '',
        code: r.jobCode.trim(),
        taskTitle: r.title.trim(),
      }));

    endTaskMutation.mutate(
      {
        taskUuid,
        payload: {
          serviceDate: serviceDate.toISOString(),
          techId,
          notes: notes.trim(),
          statusCode: END_TASK_STATUS_CODE,
          attendeeName: attendeeName.trim(),
          attendeeMobNo: attendeeMobNo.trim(),
          attendeeNotes: attendeeNotes.trim(),
          attendeeRating: String(rating),
          tdsBf: tdsBf.trim(),
          tdsAf: tdsAf.trim(),
          swBf: swBf.trim(),
          swAf: swAf.trim(),
          waterSource: waterSource.trim(),
          afterImages,
          bomItems,
          tasks,
          attendeeSignature: customerSignature.file,
          techieSignature: techSignature.file,
        },
      },
      {
        onSuccess: (res: Row) => {
          Alert.alert(
            'Task Ended Successfully',
            res?.message || `The task for ${task.accName || 'the customer'} has been submitted successfully.`,
            [{ text: 'Done', onPress: () => router.replace('/tasks') }],
            { cancelable: false }
          );
        },
        onError: (error) => {
          const title = error instanceof TaskActionError ? error.title : 'Failed to End Task';
          Alert.alert(title, error.message || 'Unknown error');
        },
      }
    );
  };

  /* ---------------- render ---------------- */
  if (!task && (taskQuery.isLoading || taskQuery.isFetching)) return <LoadingView label="Loading task…" />;
  if (!task) {
    return (
      <View style={styles.missing}>
        <ErrorBanner error={taskQuery.error ?? new Error('This task could not be loaded.')} />
        <GradientButton label="Back to My Tasks" icon="arrow-left" onPress={() => router.replace('/tasks')} />
      </View>
    );
  }

  const submitting = endTaskMutation.isPending;
  const excludeCodes = bomRows.filter((r) => r.id !== pickerFor).map((r) => r.code).filter(Boolean);
  const asset = [task.assetCode, task.assetName].filter(hasText).join(' · ');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Feather name="arrow-left" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.topTitle}>{isTicket ? 'Close Ticket' : 'End Task'}</Text>
        </View>

        {/* Task hero */}
        <View style={styles.hero}>
          <View style={styles.heroBubble} />
          <View style={styles.heroChip}>
            <Feather name={isTicket ? 'message-square' : 'tool'} size={12} color={colors.surface} />
            <Text style={styles.heroChipText}>
              {isTicket ? `Ticket${hasText(task.vrNo) ? ` #${task.vrNo}` : ''}` : `Service${hasText(task.serviceNo) ? ` #${task.serviceNo}` : ''}`}
            </Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {task.accName || 'Customer'}
          </Text>
          {asset ? <Text style={styles.heroLine}>{asset}</Text> : null}
          {buildAddress(task) ? (
            <Text style={styles.heroLine} numberOfLines={2}>
              {buildAddress(task)}
            </Text>
          ) : null}
        </View>

        <Section step={1} icon="user-check" title="Technician Details">
          <DateField
            label="Service Date & Time"
            mode="datetime"
            value={serviceDate}
            onChange={setServiceDate}
            maximumDate={new Date()}
            required
          />
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Work done, observations…" multiline />
          <SignatureField
            label="Technician Signature"
            value={techSignature}
            onChange={setTechSignature}
            required
          />
        </Section>

        <Section step={2} icon="users" title="Attendee Details" subtitle="Customer representative on site">
          <Field label="Attendee Name" value={attendeeName} onChangeText={setAttendeeName} placeholder="Full name" />
          <Field
            label="Attendee Mobile No"
            value={attendeeMobNo}
            onChangeText={setAttendeeMobNo}
            placeholder="9715XXXXXXXX"
            keyboardType="phone-pad"
          />
          <View style={styles.field}>
            <Text style={styles.label}>Attendee Rating</Text>
            <StarRating value={rating} onChange={setRating} />
          </View>
          <Field
            label="Attendee Notes"
            value={attendeeNotes}
            onChangeText={setAttendeeNotes}
            placeholder="Feedback from the customer"
            multiline
          />

          <Text style={styles.subHeading}>Water Quality Readings</Text>
          <View style={styles.grid}>
            <Field label="TDS Before" value={tdsBf} onChangeText={setTdsBf} placeholder="ppm" keyboardType="numeric" style={styles.gridItem} />
            <Field label="TDS After" value={tdsAf} onChangeText={setTdsAf} placeholder="ppm" keyboardType="numeric" style={styles.gridItem} />
            <Field label="Softener Before" value={swBf} onChangeText={setSwBf} placeholder="0" keyboardType="numeric" style={styles.gridItem} />
            <Field label="Softener After" value={swAf} onChangeText={setSwAf} placeholder="0" keyboardType="numeric" style={styles.gridItem} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Water Source</Text>
            <ChoiceChips
              options={['Municipal', 'Well', 'Tanker'].map((s) => ({ value: s, label: s }))}
              value={waterSource}
              onChange={(v) => setWaterSource(v === waterSource ? '' : v)}
            />
            <TextInput
              value={waterSource}
              onChangeText={setWaterSource}
              placeholder="Or type another source"
              placeholderTextColor={colors.faint}
              style={[styles.input, { marginTop: spacing.sm }]}
            />
          </View>

          <SignatureField
            label="Customer Signature"
            value={customerSignature}
            onChange={setCustomerSignature}
            required
          />
        </Section>

        <Section step={3} icon="camera" title="After Service Images" subtitle={`${afterImages.length} photo(s) added`}>
          <PhotoPicker images={afterImages} onChange={setAfterImages} prefix="after" disabled={submitting} />
        </Section>

        <Section step={4} icon="package" title="Parts Used" subtitle="Spares consumed during the visit">
          {bomRows.map((row, index) => (
            <View key={row.id} style={styles.rowCard}>
              <View style={styles.rowCardHead}>
                <Text style={styles.rowCardTitle}>Part {index + 1}</Text>
                <Pressable
                  onPress={() => setBomRows((rows) => rows.filter((r) => r.id !== row.id))}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={18} color={colors.danger} />
                </Pressable>
              </View>
              <Pressable onPress={() => setPickerFor(row.id)} style={styles.selectBtn}>
                <Feather name="search" size={16} color={row.code ? colors.primary : colors.faint} />
                <Text style={[styles.selectText, !row.code && { color: colors.faint }]} numberOfLines={1}>
                  {row.code ? `${row.code} — ${row.name}` : 'Select a part'}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.faint} />
              </Pressable>
              <View style={styles.grid}>
                <Field label="Qty" value={row.qty} onChangeText={(t) => updateBom(row.id, { qty: t })} keyboardType="numeric" style={styles.gridItem} />
                <Field label="Rate" value={row.rate} onChangeText={(t) => updateBom(row.id, { rate: t })} keyboardType="decimal-pad" style={styles.gridItem} />
              </View>
              <Field label="Tech Notes" value={row.notes} onChangeText={(t) => updateBom(row.id, { notes: t })} placeholder="e.g. replaced" />
            </View>
          ))}
          <Pressable
            onPress={() => setBomRows((rows) => [...rows, { id: nextId(), code: '', name: '', qty: '1', rate: '', notes: '' }])}
            style={styles.addBtn}
          >
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={styles.addText}>Add Part</Text>
          </Pressable>
        </Section>

        <Section step={5} icon="check-square" title="Task Checklist" subtitle="Optional job steps">
          {checkRows.map((row, index) => (
            <View key={row.id} style={styles.rowCard}>
              <View style={styles.rowCardHead}>
                <Text style={styles.rowCardTitle}>Item {index + 1}</Text>
                <Pressable
                  onPress={() => setCheckRows((rows) => rows.filter((r) => r.id !== row.id))}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={18} color={colors.danger} />
                </Pressable>
              </View>
              <Field label="Task Title" value={row.title} onChangeText={(t) => updateCheck(row.id, { title: t })} placeholder="e.g. Check pressure" />
              <Field label="Job Code" value={row.jobCode} onChangeText={(t) => updateCheck(row.id, { jobCode: t })} placeholder="e.g. JC1" />
              <Field label="Tech Notes" value={row.notes} onChangeText={(t) => updateCheck(row.id, { notes: t })} />
              <ChoiceChips
                options={TASK_STATUS_VALUES.map((s: string) => ({ value: s, label: s }))}
                value={row.status}
                onChange={(v) => updateCheck(row.id, { status: v })}
              />
            </View>
          ))}
          <Pressable
            onPress={() => setCheckRows((rows) => [...rows, { id: nextId(), title: '', jobCode: '', notes: '', status: 'Done' }])}
            style={styles.addBtn}
          >
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={styles.addText}>Add Checklist Item</Text>
          </Pressable>
        </Section>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => router.replace('/tasks')}
            disabled={submitting}
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <GradientButton
            label={isTicket ? 'Submit & Close Ticket' : 'Submit & End Task'}
            icon="check-circle"
            variant="end"
            loading={submitting}
            loadingLabel="Submitting…"
            onPress={submit}
            style={styles.flex}
          />
        </View>
      </ScrollView>

      <ItemPickerModal
        visible={pickerFor !== null}
        items={itemsQuery.data ?? []}
        loading={itemsQuery.isLoading}
        excludeCodes={excludeCodes}
        onClose={() => setPickerFor(null)}
        onSelect={(item: Item) => {
          if (pickerFor !== null) updateBom(pickerFor, { code: item.code, name: item.name });
          setPickerFor(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  missing: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  topTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xl,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  hero: {
    borderRadius: radius.lg + 8,
    padding: spacing.xl,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    experimental_backgroundImage: 'linear-gradient(135deg, #3b82f6, #1d4ed8, #1e3a8a)',
    gap: 4,
  },
  heroBubble: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    opacity: 0.1,
    top: -60,
    right: -40,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  heroChipText: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: fontSize.xs,
  },
  heroTitle: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: fontSize.xl,
    letterSpacing: -0.4,
  },
  heroLine: {
    fontFamily: fonts.medium,
    color: colors.primarySoft,
    fontSize: fontSize.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
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
  sectionStep: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.8,
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
  subHeading: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  field: {
    gap: spacing.xs + 2,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    flexBasis: '45%',
    flexGrow: 1,
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
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  star: {
    fontFamily: fonts.regular,
    fontSize: 32,
    color: colors.border,
  },
  starActive: {
    color: colors.amber,
  },
  starLabel: {
    fontFamily: fonts.medium,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  rowCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCardTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  selectText: {
    fontFamily: fonts.medium,
    flex: 1,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  addText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm + 1,
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancel: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.text,
  },
});
