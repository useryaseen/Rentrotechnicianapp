/**
 * Notification API endpoints.
 *
 * Mirrors the web app's usage of notification endpoints.
 */
import api from './client';
import { asList } from '../lib/apiHelpers';

/**
 * GET /api/comm/notifications/recipient/user/{userId}?Page={Page}&PageSize={PageSize}&unreadOnly={unreadOnly}&Search={Search}
 * @param {string} userId - The recipient user ID (from JWT)
 * @param {number} page - Page number (starting at 1)
 * @param {number} pageSize - Page size (e.g., 20)
 * @param {boolean} unreadOnly - If true, only unread notifications
 * @param {string} search - Search term (optional)
 * @returns {Promise<Object>} - { items: Array, hasNext: boolean, ... }
 */
export const getNotifications = async (userId, page, pageSize, unreadOnly = false, search = '') => {
  const response = await api.get(`/api/comm/notifications/recipient/user/${userId}`, {
    params: {
      Page: page,
      PageSize: pageSize,
      unreadOnly,
      Search: search,
    },
  });
  return response.data;
};

/**
 * GET /api/comm/notifications/recipient/user/{userId}/unread-count
 * @param {string} userId
 * @returns {Promise<number>} - unread count
 */
export const getUnreadCount = async (userId) => {
  const response = await api.get(`/api/comm/notifications/recipient/user/${userId}/unread-count`);
  return response.data;
};

/**
 * PATCH /api/comm/notifications/{id}/read
 * @param {string} id - Notification ID
 * @returns {Promise<void>}
 */
export const markAsRead = async (id) => {
  await api.patch(`/api/comm/notifications/${id}/read`);
};

/**
 * PATCH /api/comm/notifications/recipient/user/{userId}/read-all
 * @param {string} userId
 * @returns {Promise<void>}
 */
export const markAllAsRead = async (userId) => {
  await api.patch(`/api/comm/notifications/recipient/user/${userId}/read-all`);
};

/**
 * DELETE /api/comm/notifications/{id}
 * @param {string} id - Notification ID
 * @returns {Promise<void>}
 */
export const deleteNotification = async (id) => {
  await api.delete(`/api/comm/notifications/${id}`);
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};