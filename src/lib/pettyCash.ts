/**
 * Petty cash row normalisation — ported from the web `PettyCashPage.jsx`.
 */
type Row = Record<string, any>;

export type PettyCashEntry = {
  id: string;
  date: string;
  billDate: string;
  vrNo: string;
  fyCode: string;
  trcCode: string;
  srNo: string;
  billNo: string;
  billAmount: number;
  isTaxApplicable: boolean;
  taxPercentage: number;
  taxAmt: number;
  totalAmount: number;
  particulars: string;
  category: string;
  accName: string;
  accCode: string;
  username: string;
  trnNo: string;
  nameSuppCustomer: string;
  codeSuppCust: string;
  attachment: string;
  uuid: string;
  verified: boolean;
  approved: boolean;
  cancelled: boolean;
  canEdit: boolean;
  raw: Row;
};

export const getDateOnly = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
  const parsed = new Date(value as any);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
};

export const parseAmount = (value: unknown) => {
  const numeric = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
};

export const getValue = (source: Row | null | undefined, keys: string[]) => {
  if (!source) return '';
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
  }
  return '';
};

const hasText = (value: unknown) => {
  const text = String(value ?? '').trim().toLowerCase();
  return text !== '' && text !== 'null' && text !== 'undefined';
};

export const isImageFile = (name: string) => /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(String(name || ''));

/** Editable only while pending — verified, approved or cancelled entries lock. */
export function normalizePettyCash(row: Row, index: number): PettyCashEntry {
  const vrDate = getValue(row, ['vrDate', 'VrDate']);
  const vrNo = getValue(row, ['vrNo', 'VrNo', 'vrno', 'VRNo']);
  const billAmount = parseAmount(getValue(row, ['accAmt', 'AccAmt', 'amount', 'Amount']));
  const isTaxApplicable =
    String(getValue(row, ['isTaxApplicable', 'IsTaxApplicable']) || 'N').toUpperCase() === 'Y';
  const taxPercentage = parseAmount(getValue(row, ['taxPercentage', 'TaxPercentage']));
  const taxAmt = parseAmount(getValue(row, ['taxAmt', 'TaxAmt']));
  const verified = String(getValue(row, ['verInt', 'VerInt'])).trim().toLowerCase() === 'y';
  const approved = Number(getValue(row, ['approvalLevel', 'ApprovalLevel']) || 0) >= 1;
  const cancelled =
    String(getValue(row, ['cancInt', 'CancInt'])).trim().toLowerCase() === 'y' ||
    hasText(getValue(row, ['cancelRemarks', 'CancelRemarks']));
  const uuid = String(getValue(row, ['uuid', 'Uuid']) || '');

  return {
    id: uuid || `${getDateOnly(vrDate)}-${vrNo}-${index}`,
    date: getDateOnly(vrDate),
    billDate: getDateOnly(getValue(row, ['billDate', 'BillDate'])),
    vrNo: vrNo ? String(vrNo) : '--',
    fyCode: String(getValue(row, ['fyCode', 'FyCode', 'FYCode', 'fy_code']) || ''),
    trcCode: String(getValue(row, ['trcCode', 'TrcCode', 'TRCCode', 'trc_code']) || ''),
    srNo: String(getValue(row, ['srNo', 'SrNo', 'SRNo', 'sr_no']) || ''),
    billNo: String(getValue(row, ['billNo', 'BillNo']) || ''),
    billAmount,
    isTaxApplicable,
    taxPercentage,
    taxAmt,
    totalAmount: billAmount + (isTaxApplicable ? taxAmt : 0),
    particulars: String(getValue(row, ['particulars', 'Particulars']) || '--'),
    category: String(getValue(row, ['category', 'Category']) || 'Uncategorized'),
    accName: String(getValue(row, ['accName', 'AccName']) || ''),
    accCode: String(getValue(row, ['accCode', 'AccCode']) || ''),
    username: String(getValue(row, ['username', 'Username']) || '--'),
    trnNo: String(getValue(row, ['trnNo', 'TrnNo']) || ''),
    nameSuppCustomer: String(getValue(row, ['nameSuppCustomer', 'NameSuppCustomer']) || ''),
    codeSuppCust: String(getValue(row, ['codeSuppCust', 'CodeSuppCust']) || ''),
    attachment: String(
      getValue(row, ['attachment', 'attachmentName', 'AttachmentName', 'Attachment', 'attachement', 'Attachement']) || ''
    ),
    uuid,
    verified,
    approved,
    cancelled,
    canEdit: !verified && !approved && !cancelled,
    raw: row,
  };
}

export function pettyCashStatus(entry: PettyCashEntry) {
  if (entry.cancelled) return 'Cancelled';
  if (entry.approved) return 'Approved';
  if (entry.verified) return 'Verified';
  return 'Pending';
}

/** `{ code, name }` from the ERP's mixed lookup shapes (accounts, suppliers). */
export function toOption(row: Row) {
  const code = String(
    getValue(row, ['accCode', 'AccCode', 'acc_code', 'code', 'Code', 'suppCode', 'codeSuppCust', 'value', 'id']) || ''
  ).trim();
  const name = String(
    getValue(row, ['accName', 'AccName', 'acc_name', 'name', 'Name', 'suppName', 'nameSuppCustomer', 'description', 'label']) || ''
  ).trim();
  return { code, name: name || code };
}
