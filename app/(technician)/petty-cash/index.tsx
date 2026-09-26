import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, fonts, radius, shadows, spacing } from '@/theme';
import { EmptyState, ErrorBanner, LoadingView, SearchBar } from '@/components/ui';
import { DateField } from '@/components/form';
import GradientButton from '@/components/GradientButton';
import { usePettyCashList, useRefreshTechnician, type Row } from '@/hooks/useTechnicianQueries';
import useAuthStore from '@/store/authStore';
import { getPettyCashAttachmentUrl } from '@/api/pettyCashService';
import { formatCurrencyAED, formatDate, toIsoDate } from '@/lib/format';
import {
  isImageFile,
  normalizePettyCash,
  pettyCashStatus,
  type PettyCashEntry,
} from '@/lib/pettyCash';

const STATUS_TONES: Record<string, { color: string; background: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  Pending: { color: colors.amberDark, background: colors.amberSoft, icon: 'clock' },
  Verified: { color: colors.skyDark, background: colors.skySoft, icon: 'shield' },
  Approved: { color: colors.emeraldDark, background: colors.emeraldSoft, icon: 'check-circle' },
  Cancelled: { color: colors.danger, background: colors.dangerSoft, icon: 'x-circle' },
};

const monthStart = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

function StatusPill({ entry }: { entry: PettyCashEntry }) {
  const status = pettyCashStatus(entry);
  const tone = STATUS_TONES[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.background }]}>
      <Feather name={tone.icon} size={11} color={tone.color} />
      <Text style={[styles.pillText, { color: tone.color }]}>{status}</Text>
    </View>
  );
}

function EntryCard({ entry, onPress }: { entry: PettyCashEntry; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Feather name="file-text" size={18} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {entry.particulars}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {[formatDate(entry.date, entry.date || '--'), entry.accName, entry.category].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.amount}>{formatCurrencyAED(entry.totalAmount)}</Text>
          {entry.isTaxApplicable ? <Text style={styles.amountHint}>incl. VAT</Text> : null}
        </View>
      </View>
      <View style={styles.cardTags}>
        <StatusPill entry={entry} />
        <View style={[styles.pill, entry.isTaxApplicable ? styles.vatPill : styles.plainPill]}>
          <Text style={[styles.pillText, { color: entry.isTaxApplicable ? colors.purple : colors.slateDark }]}>
            {entry.isTaxApplicable ? `VAT ${entry.taxPercentage}%` : 'Non-VAT'}
          </Text>
        </View>
        <View style={styles.inlineMeta}>
          <Feather name="user" size={12} color={colors.muted} />
          <Text style={styles.inlineMetaText}>{entry.username}</Text>
        </View>
        {entry.attachment ? (
          <View style={styles.inlineMeta}>
            <Feather name="paperclip" size={12} color={colors.muted} />
            <Text style={styles.inlineMetaText}>{isImageFile(entry.attachment) ? 'Image' : 'File'}</Text>
          </View>
        ) : null}
        <Text style={styles.vrText}>VR {entry.vrNo}</Text>
      </View>
    </Pressable>
  );
}

function DetailRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, strong && styles.detailLabelStrong]}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={[styles.detailValue, strong && styles.detailValueStrong]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

function DetailSheet({
  entry,
  onClose,
}: {
  entry: PettyCashEntry | null;
  onClose: () => void;
}) {
  const token = useAuthStore((s: any) => s.token);
  const [imageState, setImageState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [fullImage, setFullImage] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);
  if ((entry?.id ?? null) !== shownId) {
    setShownId(entry?.id ?? null);
    setImageState('loading');
    setFullImage(false);
  }

  // The download endpoint needs the bearer token, so the image request carries it.
  const imageSource =
    entry?.attachment && isImageFile(entry.attachment)
      ? {
          uri: getPettyCashAttachmentUrl(entry.attachment),
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      : null;

  return (
    <Modal visible={!!entry} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {entry ? (
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <View style={styles.sheetHead}>
                <View style={styles.flex}>
                  <Text style={styles.eyebrow}>Petty Cash Entry</Text>
                  <Text style={styles.sheetAmount}>{formatCurrencyAED(entry.totalAmount)}</Text>
                </View>
                <StatusPill entry={entry} />
              </View>

              {imageSource ? (
                <Pressable onPress={() => imageState === 'ok' && setFullImage(true)} style={styles.preview}>
                  <Image
                    source={imageSource}
                    style={styles.previewImage}
                    resizeMode="contain"
                    onLoad={() => setImageState('ok')}
                    onError={() => setImageState('error')}
                  />
                  {imageState === 'loading' ? (
                    <View style={styles.previewOverlay}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.previewText}>Loading image…</Text>
                    </View>
                  ) : null}
                  {imageState === 'error' ? (
                    <View style={styles.previewOverlay}>
                      <Feather name="image" size={22} color={colors.faint} />
                      <Text style={styles.previewText}>Preview unavailable</Text>
                    </View>
                  ) : null}
                  {imageState === 'ok' ? (
                    <View style={styles.expandBadge}>
                      <Feather name="maximize-2" size={13} color={colors.surface} />
                      <Text style={styles.expandText}>Tap to view</Text>
                    </View>
                  ) : null}
                </Pressable>
              ) : entry.attachment ? (
                <View style={styles.fileChip}>
                  <Feather name="paperclip" size={15} color={colors.primary} />
                  <Text style={styles.fileChipText} numberOfLines={1}>
                    {entry.attachment}
                  </Text>
                </View>
              ) : null}

              <View style={styles.detailCard}>
                <DetailRow label="Date Created" value={formatDate(entry.date, entry.date || '--')} />
                {entry.billDate && entry.billDate !== entry.date ? (
                  <DetailRow label="Bill Date" value={formatDate(entry.billDate, entry.billDate)} />
                ) : null}
                {entry.billNo ? <DetailRow label="Bill No" value={entry.billNo} /> : null}
                <DetailRow label="VR No" value={entry.vrNo} />
                <DetailRow label="Expense Account" value={entry.accName || entry.accCode || '--'} />
                <DetailRow label="Category" value={entry.category} />
                {entry.trnNo ? <DetailRow label="TRN" value={entry.trnNo} /> : null}
                {entry.nameSuppCustomer ? (
                  <DetailRow
                    label="Supplier/Customer"
                    value={`${entry.nameSuppCustomer}${entry.codeSuppCust ? ` (${entry.codeSuppCust})` : ''}`}
                  />
                ) : null}
                <DetailRow
                  label="Tax Applicable"
                  value={
                    <View style={[styles.pill, entry.isTaxApplicable ? styles.vatPill : styles.plainPill]}>
                      <Text style={[styles.pillText, { color: entry.isTaxApplicable ? colors.purple : colors.slateDark }]}>
                        {entry.isTaxApplicable ? `Yes · ${entry.taxPercentage}%` : 'No'}
                      </Text>
                    </View>
                  }
                />
                <DetailRow label="Bill Amount" value={formatCurrencyAED(entry.billAmount)} />
                {entry.isTaxApplicable ? <DetailRow label="VAT Amount" value={formatCurrencyAED(entry.taxAmt)} /> : null}
                <View style={styles.divider} />
                <DetailRow label="Total Amount" value={formatCurrencyAED(entry.totalAmount)} strong />
                <DetailRow label="Raised By" value={entry.username} />
              </View>

              <View style={styles.particularsBox}>
                <Text style={styles.detailLabel}>Particulars</Text>
                <Text style={styles.particularsText}>{entry.particulars}</Text>
              </View>

            </ScrollView>

            <View style={styles.sheetFooter}>
              <Pressable onPress={onClose} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}>
                <Text style={styles.secondaryText}>Close</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        ) : null}
      </View>

      <Modal visible={fullImage} transparent animationType="fade" onRequestClose={() => setFullImage(false)}>
        <View style={styles.viewer}>
          {imageSource ? <Image source={imageSource} style={styles.viewerImage} resizeMode="contain" /> : null}
          <SafeAreaView style={styles.viewerBar} edges={['top']}>
            <Pressable onPress={() => setFullImage(false)} style={styles.viewerClose} hitSlop={10}>
              <Feather name="x" size={22} color={colors.surface} />
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </Modal>
  );
}

export default function PettyCash() {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<PettyCashEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useRefreshTechnician();

  const query = usePettyCashList(toIsoDate(fromDate), toIsoDate(toDate));

  const entries = useMemo(
    () => ((query.data ?? []) as Row[]).map((row, index) => normalizePettyCash(row, index)),
    [query.data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? entries.filter((e) =>
          [e.particulars, e.category, e.accName, e.vrNo, e.billNo].filter(Boolean).join(' ').toLowerCase().includes(q)
        )
      : entries;
    const vr = (e: PettyCashEntry) => parseInt(String(e.vrNo || '0').replace(/\D/g, ''), 10) || 0;
    return [...list].sort((a, b) => vr(b) - vr(a));
  }, [entries, search]);

  const summary = useMemo(() => {
    let total = 0;
    let pending = 0;
    entries.forEach((e) => {
      if (e.cancelled) return;
      total += e.totalAmount;
      if (e.canEdit) pending += e.totalAmount;
    });
    return { total, pending, count: entries.length };
  }, [entries]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const isThisMonth =
    toIsoDate(fromDate) === toIsoDate(monthStart()) && toIsoDate(toDate) === toIsoDate(new Date());

  if (query.isLoading && entries.length === 0) return <LoadingView label="Loading your petty cash…" />;

  return (
    <View style={styles.flex}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View>
              <Text style={styles.title}>My Petty Cash</Text>
              <Text style={styles.subtitle}>Submit and track your own petty cash entries</Text>
            </View>

            <View style={styles.summary}>
              <View style={styles.bubble} />
              <Text style={styles.summaryLabel}>Total claimed</Text>
              <Text style={styles.summaryValue}>{formatCurrencyAED(summary.total)}</Text>
              <View style={styles.summaryRow}>
                <View style={styles.flex}>
                  <Text style={styles.summaryItemValue}>{summary.count}</Text>
                  <Text style={styles.summaryItemLabel}>Entries</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.flex}>
                  <Text style={styles.summaryItemValue}>{formatCurrencyAED(summary.pending)}</Text>
                  <Text style={styles.summaryItemLabel}>Awaiting verification</Text>
                </View>
              </View>
            </View>

            <View style={styles.dateRow}>
              <DateField label="From" value={fromDate} onChange={(d) => setFromDate(d > toDate ? toDate : d)} style={styles.flex} />
              <DateField label="To" value={toDate} onChange={(d) => setToDate(d < fromDate ? fromDate : d)} style={styles.flex} />
            </View>
            {!isThisMonth ? (
              <Pressable
                onPress={() => {
                  setFromDate(monthStart());
                  setToDate(new Date());
                }}
                style={styles.monthBtn}
              >
                <Feather name="rotate-ccw" size={13} color={colors.primary} />
                <Text style={styles.monthText}>Back to this month</Text>
              </Pressable>
            ) : null}

            <SearchBar value={search} onChangeText={setSearch} placeholder="Search particulars, category, bill no…" />

            {query.error ? <ErrorBanner error={query.error} onRetry={onRefresh} /> : null}
          </View>
        }
        ListEmptyComponent={
          query.error ? null : (
            <EmptyState
              icon="credit-card"
              title="No petty cash entries"
              subtitle={search ? 'Try a different search term.' : 'Entries you submit will appear here.'}
            />
          )
        }
        renderItem={({ item }) => <EntryCard entry={item} onPress={() => setDetail(item)} />}
      />

      <View style={styles.fabWrap} pointerEvents="box-none">
        <GradientButton label="Add Petty Cash" icon="plus" onPress={() => router.push('/petty-cash/add')} />
      </View>

      <DetailSheet entry={detail} onClose={() => setDetail(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 110,
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
  summary: {
    borderRadius: radius.lg + 8,
    padding: spacing.xl,
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
    experimental_backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #1d4ed8 60%, #1e3a8a 100%)',
    ...shadows.card,
  },
  bubble: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    opacity: 0.08,
    top: -60,
    right: -40,
  },
  summaryLabel: {
    fontFamily: fonts.medium,
    color: colors.primarySoft,
    fontSize: fontSize.sm,
  },
  summaryValue: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: fontSize.xxl + 2,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryItemValue: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: fontSize.body,
  },
  summaryItemLabel: {
    fontFamily: fonts.regular,
    color: colors.primarySoft,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  monthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  monthText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs + 1,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  cardMeta: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs + 1,
    color: colors.muted,
    marginTop: 2,
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  amountHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.faint,
    marginTop: 2,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
  },
  vatPill: {
    backgroundColor: colors.purpleSoft,
  },
  plainPill: {
    backgroundColor: colors.slateSoft,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineMetaText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  vrText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.faint,
    marginLeft: 'auto',
  },
  fabWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.sm + 2,
  },
  sheetContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eyebrow: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sheetAmount: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xxl,
    letterSpacing: -0.4,
    color: colors.ink,
    marginTop: 4,
  },
  preview: {
    height: 220,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  previewText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs + 1,
    color: colors.faint,
  },
  expandBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  expandText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.surface,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  fileChipText: {
    fontFamily: fonts.medium,
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  detailCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  detailLabelStrong: {
    fontFamily: fonts.medium,
    color: colors.text,
  },
  detailValue: {
    fontFamily: fonts.medium,
    flexShrink: 1,
    textAlign: 'right',
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  detailValueStrong: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  particularsBox: {
    gap: 4,
  },
  particularsText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.ink,
    lineHeight: 22,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.96)',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '85%',
  },
  viewerBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    alignItems: 'flex-end',
    padding: spacing.lg,
  },
  viewerClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
