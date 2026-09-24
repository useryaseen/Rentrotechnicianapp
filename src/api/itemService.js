/**
 * Item API endpoint (for BOM search in End Task).
 *
 * Mirrors the web app's usage of InvItemMaster.
 */
import api from './client';
import { asList } from '../lib/apiHelpers';

/**
 * GET /api/InvItemMaster
 * @returns {Promise<Array>} - list of items: [{ ite_Code, ite_Name, ... }, ...]
 */
export const getItemMaster = async () => {
  const response = await api.get('/api/InvItemMaster');
  return asList(response.data);
};

export default {
  getItemMaster,
};