/**
 * Add / Edit Petty Cash — spec §6.10, §8.6.
 *
 * Create: POST /api/PettyCash?<scalars> with the bill as multipart "Attachement".
 * Edit:   PUT  /api/PettyCash/{fy}/{trc}/{vr}/{sr} with the full record; only while the
 *         entry is not verified, approved or cancelled.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, fonts, radius, shadows, spacing } from '@/theme';
import GradientButton from '@/components/GradientButton';
import PhotoPicker, { type LocalImage } from '@/components/PhotoPicker';
import { ErrorBanner, LoadingView } from '@/components/ui';
import { DateField, FormField, FormSection, SelectField, formStyles, type Option } from '@/components/form';
import { useTechnicianIdentity, type Row } from '@/hooks/useTechnicianQueries';
import useAuthStore from '@/store/authStore';
import {
  createPettyCashEntry,
  getCategoryList,
  getExpenseAccountList,
  getMainAccountList,
  getPettyCashAttachmentUrl,
  getPettyCashByKeys,
  getPettyCashByUuid,
  getSuppliers,
  updatePettyCashEntry,
} from '@/api/pettyCashService';
import { getErrorMessage } from '@/lib/apiHelpers';
import { formatCurrencyAED, parseApiDate, toIsoDate } from '@/lib/format';
import { getValue, isImageFile, normalizePettyCash, parseAmount, toOption } from '@/lib/pettyCash';

/** Company code sent with every create (matches the ERP's `10` company / branch). */
const COMPANY_CODE = '10';
const DEFAULT_VAT = '5';

const toApiDate = (date: Date) => `${toIsoDate(date)}T00:00:00`;

/** Set a field on the API record, keeping whatever casing the record already uses. */
function setField(model: Row, key: string, value: unknown) {
  const existing = Object.keys(model).find((k) => k.toLowerCase() === key.toLowerCase());
  model[existing ?? key] = value;
}

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AddPettyCash() {
  const params = useLocalSearchParams<{
    mode?: string;
    fyCode?: string;
    trcCode?: string;
    vrNo?: string;
    srNo?: string;
    uuid?: string;
  }>();
  const isEdit = params.mode === 'edit';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { rawUsername } = useTechnicianIdentity();
  const token = useAuthStore((s: any) => s.token);

  /* ---------------- lookups ---------------- */
  const mainAccountsQuery = useQuery({
    queryKey: ['technician', 'pettyCashMainAccounts'],
    queryFn: async () => ((await getMainAccountList()) as Row[]).map(toOption).filter((o) => o.code),
    staleTime: 30 * 60 * 1000,
  });
  const expenseAccountsQuery = useQuery({
    queryKey: ['technician', 'pettyCashExpenseAccounts'],
    queryFn: async () => ((await getExpenseAccountList()) as Row[]).map(toOption).filter((o) => o.code),
    staleTime: 30 * 60 * 1000,
  });
  const categoriesQuery = useQuery({
    queryKey: ['technician', 'pettyCashCategories'],
    queryFn: async (): Promise<Option[]> => {
      const data = await getCategoryList();
      if (Array.isArray(data)) return (data as Row[]).map(toOption).filter((o) => o.code);
      return Object.entries(data ?? {}).map(([code, name]) => ({ code, name: String(name) }));
    },
    staleTime: 30 * 60 * 1000,
  });

  /* ---------------- edit: hydrate the full record ---------------- */
  const hasKeys = !!(params.fyCode && params.trcCode && params.vrNo && params.srNo);
  const recordQuery = useQuery({
    queryKey: ['technician', 'pettyCashRecord', params.fyCode, params.trcCode, params.vrNo, params.srNo, params.uuid],
    queryFn: async () =>
      hasKeys
        ? getPettyCashByKeys({
            fyCode: params.fyCode,
            trcCode: params.trcCode,
            vrNo: params.vrNo,
            srNo: params.srNo,
          })
        : getPettyCashByUuid(params.uuid),
    enabled: isEdit && (hasKeys || !!params.uuid),
  });
  const record: Row | null = isEdit ? (recordQuery.data as Row) ?? null : null;
  const entry = useMemo(() => (record ? normalizePettyCash(record, 0) : null), [record]);

  /* ---------------- form state ---------------- */
  const [vrDate, setVrDate] = useState(() => new Date());
  const [mainAccount, setMainAccount] = useState<Option | null>(null);
  const [expenseAccount, setExpenseAccount] = useState<Option | null>(null);
  const [category, setCategory] = useState<Option | null>(null);
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(() => new Date());
  const [amount, setAmount] = useState('');
  const [vatApplicable, setVatApplicable] = useState(false);
  const [vatPercent, setVatPercent] = useState(DEFAULT_VAT);
  const [supplierName, setSupplierName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [trnNo, setTrnNo] = useState('');
  const [particulars, setParticulars] = useState('');
  const [bill, setBill] = useState<LocalImage[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Default the main account to the first one offered (create mode).
  if (!isEdit && !mainAccount && mainAccountsQuery.data?.length) {
    setMainAccount(mainAccountsQuery.data[0]);
  }

  // Prefill from the hydrated record once (edit mode).
  const [prefilled, setPrefilled] = useState(false);
  if (isEdit && entry && record && !prefilled && categoriesQuery.data && expenseAccountsQuery.data && mainAccountsQuery.data) {
    setPrefilled(true);
    setVrDate(parseApiDate(entry.date) ?? new Date());
    setBillDate(parseApiDate(entry.billDate || entry.date) ?? new Date());
    setBillNo(entry.billNo);
    setAmount(entry.billAmount ? String(entry.billAmount) : '');
    setVatApplicable(entry.isTaxApplicable);
    setVatPercent(entry.taxPercentage ? String(entry.taxPercentage) : DEFAULT_VAT);
    setSupplierName(entry.nameSuppCustomer);
    setSupplierCode(entry.codeSuppCust);
    setTrnNo(entry.trnNo);
    setParticulars(entry.particulars === '--' ? '' : entry.particulars);
    setExpenseAccount(
      expenseAccountsQuery.data.find((o) => o.code === entry.accCode) ??
        (entry.accCode ? { code: entry.accCode, name: entry.accName || entry.accCode } : null)
    );
    const categoryValue = String(entry.category);
    setCategory(
      categoriesQuery.data.find((o) => o.code === categoryValue || o.name === categoryValue) ?? null
    );
    const mainCode = String(getValue(record, ['mainAccount', 'MainAccount']) || '');
    setMainAccount(mainAccountsQuery.data.find((o) => o.code === mainCode) ?? mainAccountsQuery.data[0] ?? null);
  }

  /* ---------------- supplier search ---------------- */
  const [supplierFocused, setSupplierFocused] = useState(false);
  const debouncedSupplier = useDebounced(supplierName.trim());
  const suppliersQuery = useQuery({
    queryKey: ['technician', 'pettyCashSuppliers', debouncedSupplier],
    queryFn: async () => ((await getSuppliers(debouncedSupplier)) as Row[]).map(toOption).filter((o) => o.name),
    enabled: supplierFocused && debouncedSupplier.length >= 2 && !supplierCode,
    staleTime: 5 * 60 * 1000,
  });

  /* ---------------- amounts ---------------- */
  const billAmount = parseAmount(amount);
  const vatAmount = vatApplicable ? Math.round(billAmount * parseAmount(vatPercent)) / 100 : 0;
  const total = billAmount + vatAmount;

  /* ---------------- submit ---------------- */
  const validate = () => {
    if (!mainAccount) return 'Please select the main account.';
    if (!expenseAccount) return 'Please select the expense account.';
    if (!category) return 'Please select a category.';
    if (!(billAmount > 0)) return 'Please enter the bill amount.';
    if (vatApplicable && !(parseAmount(vatPercent) > 0)) return 'Please enter the VAT percentage.';
    if (!particulars.trim()) return 'Please describe the expense in Particulars.';
    if (!isEdit && !bill.length) return 'Please attach a photo of the bill.';
    return null;
  };

  const done = (title: string, message: string) => {
    queryClient.invalidateQueries({ queryKey: ['technician', 'pettyCash'] });
    Alert.alert(title, message, [{ text: 'Done', onPress: () => router.replace('/petty-cash') }], {
      cancelable: false,
    });
  };

  const submit = async () => {
    const problem = validate();
    if (problem) {
      Alert.alert('Check the form', problem);
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && entry && record) {
        const model: Row = { ...record };
        setField(model, 'vrDate', toApiDate(vrDate));
        setField(model, 'mainAccount', mainAccount!.code);
        setField(model, 'accCode', expenseAccount!.code);
        setField(model, 'accName', expenseAccount!.name);
        setField(model, 'category', category!.code);
        setField(model, 'billNo', billNo.trim());
        setField(model, 'billDate', toApiDate(billDate));
        setField(model, 'accAmt', billAmount);
        setField(model, 'isTaxApplicable', vatApplicable ? 'Y' : 'N');
        setField(model, 'taxPercentage', vatApplicable ? parseAmount(vatPercent) : 0);
        setField(model, 'taxAmt', vatAmount);
        setField(model, 'nameSuppCustomer', supplierName.trim());
        setField(model, 'codeSuppCust', supplierCode);
        setField(model, 'trnNo', trnNo.trim());
        setField(model, 'particulars', particulars.trim());
        const res: Row = (await updatePettyCashEntry(
          { fyCode: entry.fyCode, trcCode: entry.trcCode, vrNo: entry.vrNo, srNo: entry.srNo },
          model
        )) ?? {};
        if (res.isValid === false || res.success === false) {
          Alert.alert('Update Failed', res.errorMessage || res.message || 'The entry could not be updated.');
          return;
        }
        done('Petty Cash Updated', res.successMessage || res.message || 'Your petty cash entry has been updated.');
        return;
      }

      const query: Record<string, string | number> = {
        VrDate: toApiDate(vrDate),
        MainAccount: mainAccount!.code,
        Username: rawUsername,
        AccCode: expenseAccount!.code,
        BillNo: billNo.trim(),
        BillDate: toApiDate(billDate),
        AccAmt: billAmount,
        Particulars: particulars.trim(),
        Category: category!.code,
        IsTaxApplicable: vatApplicable ? 'Y' : 'N',
        CompanyCode: COMPANY_CODE,
      };
      if (vatApplicable) {
        query.TaxPercentage = parseAmount(vatPercent);
        query.TaxAmt = vatAmount;
      }
      if (supplierName.trim()) query.NameSuppCustomer = supplierName.trim();
      if (supplierCode) query.CodeSuppCust = supplierCode;
      if (trnNo.trim()) query.TrnNo = trnNo.trim();

      const res: Row = (await createPettyCashEntry(query, bill[bill.length - 1])) ?? {};
      if (res.isValid === false) {
        Alert.alert('Could not save', res.errorMessage || 'The petty cash entry was rejected.');
        return;
      }
      done('Petty Cash Submitted', res.successMessage || 'Your petty cash entry has been submitted.');
    } catch (error) {
      Alert.alert(isEdit ? 'Update Failed' : 'Could not save', getErrorMessage(error, 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- render ---------------- */
  if (isEdit && recordQuery.isLoading) return <LoadingView label="Loading petty cash entry…" />;
  if (isEdit && (recordQuery.error || !entry)) {
    return (
      <View style={styles.center}>
        <ErrorBanner error={recordQuery.error ?? new Error('This entry could not be loaded.')} />
        <GradientButton label="Back to Petty Cash" icon="arrow-left" onPress={() => router.replace('/petty-cash')} />
      </View>
    );
  }
  if (isEdit && entry && !entry.canEdit) {
    return (
      <View style={styles.center}>
        <View style={styles.lockIcon}>
          <Feather name="lock" size={26} color={colors.slateDark} />
        </View>
        <Text style={styles.lockTitle}>Entry locked</Text>
        <Text style={styles.lockText}>
          This petty cash has already been verified and can no longer be edited.
        </Text>
        <GradientButton label="Back to Petty Cash" icon="arrow-left" onPress={() => router.replace('/petty-cash')} />
      </View>
    );
  }

  const existingBill =
    isEdit && entry?.attachment && isImageFile(entry.attachment)
      ? {
          uri: getPettyCashAttachmentUrl(entry.attachment),
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      : null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Feather name="arrow-left" size={22} color={colors.ink} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.topTitle}>{isEdit ? 'Edit Petty Cash' : 'Add Petty Cash'}</Text>
            {isEdit && entry ? <Text style={styles.topSubtitle}>VR {entry.vrNo}</Text> : null}
          </View>
        </View>

        <FormSection icon="book-open" title="Voucher" subtitle="Accounts and category">
          <DateField label="Voucher Date" value={vrDate} onChange={setVrDate} maximumDate={new Date()} required />
          <SelectField
            label="Main Account"
            value={mainAccount}
            options={mainAccountsQuery.data ?? []}
            onChange={setMainAccount}
            loading={mainAccountsQuery.isLoading}
            required
          />
          <SelectField
            label="Expense Account"
            value={expenseAccount}
            options={expenseAccountsQuery.data ?? []}
            onChange={setExpenseAccount}
            loading={expenseAccountsQuery.isLoading}
            placeholder="Select expense account"
            required
          />
          <SelectField
            label="Category"
            value={category}
            options={categoriesQuery.data ?? []}
            onChange={setCategory}
            loading={categoriesQuery.isLoading}
            placeholder="Select category"
            required
          />
        </FormSection>

        <FormSection icon="file-text" title="Bill Details">
          <FormField label="Bill No" value={billNo} onChangeText={setBillNo} placeholder="B-1234" />
          <DateField label="Bill Date" value={billDate} onChange={setBillDate} maximumDate={new Date()} />
          <FormField
            label="Bill Amount (excl. VAT)"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            required
          />
          <View style={styles.vatRow}>
            <View style={styles.flex}>
              <Text style={styles.vatTitle}>VAT applicable</Text>
              <Text style={styles.vatHint}>Turn on if the bill includes VAT</Text>
            </View>
            <Switch
              value={vatApplicable}
              onValueChange={setVatApplicable}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          {vatApplicable ? (
            <View style={formStyles.row}>
              <FormField
                label="VAT %"
                value={vatPercent}
                onChangeText={setVatPercent}
                keyboardType="decimal-pad"
                style={formStyles.half}
              />
              <FormField
                label="VAT Amount"
                value={vatAmount.toFixed(2)}
                onChangeText={() => {}}
                editable={false}
                style={formStyles.half}
              />
            </View>
          ) : null}
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrencyAED(total)}</Text>
          </View>
        </FormSection>

        <FormSection icon="shopping-bag" title="Supplier" subtitle="Who issued the bill (optional)">
          <View>
            <FormField
              label="Supplier / Customer"
              value={supplierName}
              onChangeText={(text) => {
                setSupplierName(text);
                setSupplierCode('');
                setSupplierFocused(true);
              }}
              placeholder="Start typing to search"
            />
            {supplierCode ? (
              <View style={styles.linked}>
                <Feather name="link" size={12} color={colors.emeraldDark} />
                <Text style={styles.linkedText}>Linked to {supplierCode}</Text>
              </View>
            ) : null}
            {supplierFocused && !supplierCode && debouncedSupplier.length >= 2 ? (
              <View style={styles.suggestions}>
                {suppliersQuery.isFetching ? (
                  <View style={styles.suggestionLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (suppliersQuery.data ?? []).length === 0 ? (
                  <Text style={styles.suggestionEmpty}>No saved supplier — the name will be used as typed.</Text>
                ) : (
                  (suppliersQuery.data ?? []).slice(0, 6).map((option) => (
                    <Pressable
                      key={`${option.code}-${option.name}`}
                      onPress={() => {
                        setSupplierName(option.name);
                        setSupplierCode(option.code);
                        setSupplierFocused(false);
                      }}
                      style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.divider }]}
                    >
                      <Feather name="briefcase" size={14} color={colors.muted} />
                      <Text style={styles.suggestionText} numberOfLines={1}>
                        {option.name}
                      </Text>
                      <Text style={styles.suggestionCode}>{option.code}</Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
          </View>
          <FormField label="TRN No" value={trnNo} onChangeText={setTrnNo} placeholder="Tax registration number" />
        </FormSection>

        <FormSection icon="edit-3" title="Particulars">
          <FormField
            label="Description"
            value={particulars}
            onChangeText={setParticulars}
            placeholder="e.g. Diesel for site visit"
            multiline
            required
          />
        </FormSection>

        <FormSection
          icon="paperclip"
          title="Bill Attachment"
          subtitle={isEdit ? 'The bill already on file is kept' : 'Photo of the bill (required)'}
        >
          {isEdit ? (
            existingBill ? (
              <Image source={existingBill} style={styles.existingBill} resizeMode="contain" />
            ) : entry?.attachment ? (
              <View style={styles.fileChip}>
                <Feather name="paperclip" size={15} color={colors.primary} />
                <Text style={styles.fileChipText} numberOfLines={1}>
                  {entry.attachment}
                </Text>
              </View>
            ) : (
              <Text style={styles.vatHint}>No bill on file.</Text>
            )
          ) : (
            <PhotoPicker images={bill} onChange={(images) => setBill(images.slice(-1))} prefix="bill" disabled={submitting} />
          )}
        </FormSection>

        <View style={styles.footer}>
          <Pressable
            onPress={() => router.back()}
            disabled={submitting}
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <GradientButton
            label={isEdit ? 'Save Changes' : 'Submit Petty Cash'}
            icon="check-circle"
            variant="primary"
            loading={submitting}
            loadingLabel={isEdit ? 'Saving…' : 'Submitting…'}
            onPress={submit}
            style={styles.flex}
          />
        </View>
      </ScrollView>
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
  center: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  lockIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.slateSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xl,
    color: colors.ink,
    textAlign: 'center',
  },
  lockText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.muted,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  topSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  vatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  vatTitle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  vatHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs + 1,
    color: colors.muted,
    marginTop: 2,
  },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  totalLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.primaryDark,
  },
  totalValue: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xl,
    letterSpacing: -0.3,
    color: colors.primaryDark,
  },
  linked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  linkedText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.emeraldDark,
  },
  suggestions: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  suggestionLoading: {
    padding: spacing.md,
    alignItems: 'center',
  },
  suggestionEmpty: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs + 1,
    color: colors.muted,
    padding: spacing.md,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  suggestionText: {
    fontFamily: fonts.medium,
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  suggestionCode: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.faint,
  },
  existingBill: {
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.background,
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
