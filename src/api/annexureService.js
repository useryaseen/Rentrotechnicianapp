/**
 * Annexure API endpoints (for installations).
 *
 * Mirrors the web app's usage of annexure endpoints.
 */
import api from './client';
import { asList } from '../lib/apiHelpers';

/**
 * GET /api/Annexure/installation/all?ibInstallation=true&fromDate={fromDate}&toDate={toDate}
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate - YYYY-MM-DD
 * @returns {Promise<Array>} - list of installation jobs (may be bare array or { instalationList: [...] } or { installationList: [...] })
 */
export const getInstallationAll = async (fromDate, toDate) => {
  const response = await api.get('/api/Annexure/installation/all', {
    params: {
      ibInstallation: true,
      fromDate,
      toDate,
    },
  });
  return asList(response.data, ['instalationList', 'installationList']);
};

/**
 * GET /api/Annexure/details/{uuid}
 * @param {string} uuid
 * @returns {Promise<Object>} - installation details (used for assetCode fallback)
 */
export const getAnnexureDetails = async (uuid) => {
  const response = await api.get(`/api/Annexure/details/${uuid}`);
  return response.data;
};

/**
 * GET /api/Annexure/installation/Installationstatus
 * @returns {Promise<Array|Object>} - array of { code, description } or object map
 */
export const getInstallationStatusList = async () => {
  const response = await api.get('/api/Annexure/installation/Installationstatus');
  return response.data;
};

export default {
  getInstallationAll,
  getAnnexureDetails,
  getInstallationStatusList,
};