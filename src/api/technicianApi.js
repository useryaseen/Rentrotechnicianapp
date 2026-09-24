/**
 * Technician API endpoints.
 *
 * Mirrors the web app's `src/api/technicianApi.js` exactly.
 *
 * All endpoints are under the base URL set in `src/api/client.js`.
 *
 * We use the axios instance from `./client` which already has the token interceptor.
 *
 * Response normalization is done using helpers from `../lib/apiHelpers`.
 */
import api from './client';
import { asList, pickField, pickText, isFailureEnvelope, getErrorMessage } from '../lib/apiHelpers';

/**
 * GET /api/PMSchedule/getservicestatus
 * @returns {Promise<Array<{ code: string, description: string }>>}
 */
export const getServiceStatusList = async () => {
  const response = await api.get('/api/PMSchedule/getservicestatus');
  return asList(response.data);
};

/**
 * GET /api/PMSchedule/supportticketstatus
 * @returns {Promise<Object>} - e.g., { "001": "Open", "002": "Waiting for Parts", ... }
 */
export const getSupportTicketStatusList = async () => {
  const response = await api.get('/api/PMSchedule/supportticketstatus');
  return response.data;
};

/**
 * GET /api/PMSchedule/servicelistbyteche?UserName={apiUsername}
 * @param {string} apiUsername - The technician's apiUsername (from profile)
 * @returns {Promise<Array>} - list of services (may be bare array or { serviceList: [...] })
 */
export const getServiceList = async (apiUsername) => {
  const response = await api.get(`/api/PMSchedule/servicelistbyteche`, {
    params: { UserName: apiUsername },
  });
  return asList(response.data, ['serviceList']);
};

/**
 * GET /api/PMSchedule/servicereqlistbyteche?UserName={apiUsername}
 * @param {string} apiUsername
 * @returns {Promise<Array>} - list of service requests/tickets
 */
export const getServiceRequests = async (apiUsername) => {
  const response = await api.get(`/api/PMSchedule/servicereqlistbyteche`, {
    params: { UserName: apiUsername },
  });
  return asList(response.data, ['serviceRequestList', 'requestList', 'requests']);
};

/**
 * GET /api/PMSchedule/tasklistbyteche?UserName={apiUsername}
 * @param {string} apiUsername
 * @returns {Promise<Object>} - the mixed tasks list with keys: serviceList, serviceRequestList, instalationList/installationList
 */
export const getMyTasks = async (apiUsername) => {
  const response = await api.get(`/api/PMSchedule/tasklistbyteche`, {
    params: { UserName: apiUsername },
  });
  return response.data;
};

/**
 * GET /api/PMSchedule/tasklistbytechebyid?uuid={uuid}
 * @param {string} uuid
 * @returns {Promise<Object>} - full task object for the detail/end screens
 */
export const getTaskById = async (uuid) => {
  const response = await api.get(`/api/PMSchedule/tasklistbytechebyid`, {
    params: { uuid },
  });
  return response.data;
};

/**
 * GET /api/PMSchedule/getservicereportbyuuid?uuid={uuid}
 * @param {string} uuid
 * @returns {Promise<Object>} - the job card / service report
 */
export const getServiceReportByUuid = async (uuid) => {
  const response = await api.get(`/api/PMSchedule/getservicereportbyuuid`, {
    params: { uuid },
  });
  return response.data;
};

/**
 * POST /api/PMSchedule/starttask/{scheduleUuid}
 * @param {string} scheduleUuid - The schedule uuid (or schVrno or vrNo) from the task row
 * @param {FormData} formData - Must contain one or more parts with name "AssetImagesBeforeTaskStart"
 * @returns {Promise<Object>} - { uuid | taskUuid, taskInitiated }
 */
export const startTask = async (scheduleUuid, formData) => {
  const response = await api.post(`/api/PMSchedule/starttask/${scheduleUuid}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * POST /api/PMSchedule/endtask/{taskUuid}
 * @param {string} taskUuid - The taskinitiated GUID (visit id)
 * @param {FormData} formData - The payload built by `buildFormData` in the EndTask screen
 * @returns {Promise<Object>} - { uuid, message? }
 */
export const endTask = async (taskUuid, formData) => {
  const response = await api.post(`/api/PMSchedule/endtask/${taskUuid}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 minutes for slow connections
  });
  return response.data;
};

/**
 * POST /api/PMSchedule/canceltask/{taskUuid}
 * @param {string} taskUuid - The taskinitiated GUID or schedule uuid/schVrno/vrNo
 * @returns {Promise<void>}
 */
export const cancelTask = async (taskUuid) => {
  await api.post(`/api/PMSchedule/canceltask/${taskUuid}`);
};

/**
 * PUT /api/PMSchedule/installation/{uuid}/start
 * @param {string} uuid - The installation uuid
 * @returns {Promise<void>}
 */
export const startInstallation = async (uuid) => {
  await api.put(`/api/PMSchedule/installation/${uuid}/start`);
};

/**
 * PUT /api/PMSchedule/installation/{uuid}/end
 * @param {string} uuid - The installation uuid
 * @param {Array} dtoArray - Array containing a single ProductInstallationDto object (as per spec §9.5)
 * @returns {Promise<Object>} - { success, statusCode, message, data }
 */
export const endInstallation = async (uuid, dtoArray) => {
  const response = await api.put(`/api/PMSchedule/installation/${uuid}/end`, dtoArray, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000,
  });
  return response.data;
};

/**
 * GET /api/PMSchedule/installation/asset?Assetgroup={assetGroup}
 * @param {string} assetGroup
 * @returns {Promise<Array>} - list of assets eligible for the product group
 */
export const getInstallationAssets = async (assetGroup) => {
  const response = await api.get(`/api/PMSchedule/installation/asset`, {
    params: { Assetgroup: assetGroup },
  });
  return asList(response.data);
};

export default {
  getServiceStatusList,
  getSupportTicketStatusList,
  getServiceList,
  getServiceRequests,
  getMyTasks,
  getTaskById,
  getServiceReportByUuid,
  startTask,
  endTask,
  cancelTask,
  startInstallation,
  endInstallation,
  getInstallationAssets,
};