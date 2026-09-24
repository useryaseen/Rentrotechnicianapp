/**
 * Zone API endpoints.
 *
 * Mirrors the web app's usage of zone endpoints.
 */
import api from './client';
import { asList } from '../lib/apiHelpers';

/**
 * GET /api/Zone
 * @returns {Promise<Array>} - list of zones: [{ zoneID, zoneName }, ...]
 */
export const getZoneList = async () => {
  const response = await api.get('/api/Zone');
  return asList(response.data);
};

/**
 * GET /api/Zone/{zoneID}
 * @param {string} zoneID
 * @returns {Promise<Object>} - { details: [ { areaID: "001:Deira", ... } ] }
 */
export const getZoneDetails = async (zoneID) => {
  const response = await api.get(`/api/Zone/${zoneID}`);
  return response.data;
};

export default {
  getZoneList,
  getZoneDetails,
};