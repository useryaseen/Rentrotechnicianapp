/**
 * Petty Cash API endpoints (spec §6.10, §8.6).
 *
 * Note: the API expects the bill file in a multipart part named "Attachement" (one 't').
 * The other create parameters are sent on the query string.
 */
import api from './client';
import { asList } from '../lib/apiHelpers';

/**
 * GET /api/PettyCash/userid?userid={rawUsername}&stDate={stDate}&endDate={endDate}
 * @returns {Promise<Array>} - list of petty cash entries
 */
export const getPettyCashList = async (rawUsername, stDate, endDate) => {
  const response = await api.get('/api/PettyCash/userid', {
    params: { userid: rawUsername, stDate, endDate },
  });
  return asList(response.data);
};

/** GET /api/PettyCash/{fyCode}/{trcCode}/{vrNo}/{srNo} — full record for edit mode. */
export const getPettyCashByKeys = async ({ fyCode, trcCode, vrNo, srNo }) => {
  const path = [fyCode, trcCode, vrNo, srNo].map((v) => encodeURIComponent(String(v))).join('/');
  const response = await api.get(`/api/PettyCash/${path}`);
  return Array.isArray(response.data) ? response.data[0] : response.data?.data ?? response.data;
};

/** GET /api/PettyCash/{uuid} — fallback when the voucher keys are missing. */
export const getPettyCashByUuid = async (uuid) => {
  const response = await api.get(`/api/PettyCash/${encodeURIComponent(uuid)}`);
  return Array.isArray(response.data) ? response.data[0] : response.data?.data ?? response.data;
};

/**
 * POST /api/PettyCash?<scalars> with the bill as multipart "Attachement".
 * @param {Object} params - VrDate, MainAccount, Username, AccCode, BillNo, BillDate, AccAmt, …
 * @param {{ uri: string, name: string, type: string }} billFile
 * @returns {Promise<{ isValid?: boolean, successMessage?: string, errorMessage?: string }>}
 */
export const createPettyCashEntry = async (params, billFile) => {
  const formData = new FormData();
  formData.append('Attachement', { uri: billFile.uri, name: billFile.name, type: billFile.type });
  const response = await api.post('/api/PettyCash', formData, {
    params,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return response.data;
};

/**
 * PUT /api/PettyCash/{fyCode}/{trcCode}/{vrNo}/{srNo} with the full model (spec §6.10 edit mode).
 */
export const updatePettyCashEntry = async ({ fyCode, trcCode, vrNo, srNo }, model) => {
  const path = [fyCode, trcCode, vrNo, srNo].map((v) => encodeURIComponent(String(v))).join('/');
  const response = await api.put(`/api/PettyCash/${path}`, model, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/**
 * URL of GET /api/PettyCash/download/{attachmentName}. The endpoint needs the bearer
 * token, so pass it as a header (e.g. `<Image source={{ uri, headers }} />`).
 */
export const getPettyCashAttachmentUrl = (attachmentName) =>
  `${String(api.defaults.baseURL ?? '').replace(/\/$/, '')}/api/PettyCash/download/${encodeURIComponent(
    attachmentName
  )}`;

/** GET /api/PettyCash/mainaccount */
export const getMainAccountList = async () => {
  const response = await api.get('/api/PettyCash/mainaccount');
  return asList(response.data);
};

/** GET /api/PettyCash/expenseaccounts */
export const getExpenseAccountList = async () => {
  const response = await api.get('/api/PettyCash/expenseaccounts');
  return asList(response.data);
};

/** GET /api/PettyCash/categories — e.g. `{ "001": "Fuel / Petrol", … }` */
export const getCategoryList = async () => {
  const response = await api.get('/api/PettyCash/categories');
  return response.data;
};

/** POST /api/PettyCash/getsuppliers?query={query} */
export const getSuppliers = async (query) => {
  const response = await api.post('/api/PettyCash/getsuppliers', null, {
    params: { query },
  });
  return asList(response.data);
};

export default {
  getPettyCashList,
  getPettyCashByKeys,
  getPettyCashByUuid,
  createPettyCashEntry,
  updatePettyCashEntry,
  getPettyCashAttachmentUrl,
  getMainAccountList,
  getExpenseAccountList,
  getCategoryList,
  getSuppliers,
};
