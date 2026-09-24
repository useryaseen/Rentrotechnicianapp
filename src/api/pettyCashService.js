/**
 * Petty Cash API endpoints.
 *
 * Mirrors the web app's usage of petty cash endpoints.
 *
 * Note: The API expects the bill file in a multipart part named "Attachement" (one 't').
 * The other parameters are sent as query string parameters.
 */
import api from './client';
import { buildFormData } from '../lib/formDataUtils';
import { asList } from '../lib/apiHelpers';

/**
 * GET /api/PettyCash/userid?userid={rawUsername}&stDate={stDate}&endDate={endDate}
 * @param {string} rawUsername - The raw login username (from auth)
 * @param {string} stDate - YYYY-MM-DD (start date, optional)
 * @param {string} endDate - YYYY-MM-DD (end date, optional)
 * @returns {Promise<Array>} - list of petty cash entries
 */
export const getPettyCashList = async (rawUsername, stDate, endDate) => {
  const response = await api.get('/api/PettyCash/userid', {
    params: {
      userid: rawUsername,
      stDate,
      endDate,
    },
  });
  return asList(response.data);
};

/**
 * POST /api/PettyCash
 * @param {Object} params - Query string parameters (VrDate, MainAccount, Username, AccCode, etc.)
 * @param {File} billFile - The bill file (image or PDF) to upload as "Attachement"
 * @returns {Promise<Object>} - { isValid: boolean, successMessage?: string, errorMessage?: string }
 */
export const createPettyCashEntry = async (params, billFile) => {
  // Build the FormData with the bill file
  const formData = new FormData();
  formData.append('Attachement', billFile, billFile.name); // Note: one 't' in Attachement
  // Note: The web app does not put any other fields in the FormData; they are in the query string.
  // So we only append the file.

  const response = await api.post('/api/PettyCash', formData, {
    params, // axios will put these in the query string
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * GET /api/PettyCash/download/{attachmentName}
 * @param {string} attachmentName - The filename of the attachment (as stored in the entry)
 * @returns {Promise<Object>} - Axios response with data as blob (we'll return the whole response)
 * Note: The caller must handle the blob (e.g., create a download link).
 */
export const downloadPettyCashAttachment = async (attachmentName) => {
  const response = await api.get(`/api/PettyCash/download/${attachmentName}`, {
    responseType: 'blob', // Important: we want the binary data
  });
  return response;
};

/**
 * GET /api/PettyCash/mainaccount
 * @returns {Promise<Array>} - list of main accounts
 */
export const getMainAccountList = async () => {
  const response = await api.get('/api/PettyCash/mainaccount');
  return asList(response.data);
};

/**
 * GET /api/PettyCash/expenseaccounts
 * @returns {Promise<Array>} - list of expense accounts
 */
export const getExpenseAccountList = async () => {
  const response = await api.get('/api/PettyCash/expenseaccounts');
  return asList(response.data);
};

/**
 * GET /api/PettyCash/categories
 * @returns {Promise<Object>} - e.g., { "001": "Fuel / Petrol", ... }
 */
export const getCategoryList = async () => {
  const response = await api.get('/api/PettyCash/categories');
  return response.data;
};

/**
 * POST /api/PettyCash/getsuppliers?query={query}
 * @param {string} query - Search string
 * @returns {Promise<Array>} - list of suppliers
 */
export const getSuppliers = async (query) => {
  const response = await api.post('/api/PettyCash/getsuppliers', null, {
    params: { query },
  });
  return asList(response.data);
};

export default {
  getPettyCashList,
  createPettyCashEntry,
  downloadPettyCashAttachment,
  getMainAccountList,
  getExpenseAccountList,
  getCategoryList,
  getSuppliers,
};