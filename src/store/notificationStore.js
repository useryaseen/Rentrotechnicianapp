import { create } from 'zustand';
import notificationService from '../api/notificationService';
import useAuthStore from './authStore';

const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  notifications: [],
  pollingInterval: null,
  isFetching: false,

  startPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) return;
    const interval = setInterval(() => {
      get().fetchUnreadCount();
    }, 30 * 1000);
    set({ pollingInterval: interval });
    get().fetchUnreadCount();
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  fetchUnreadCount: async () => {
    const { userId } = useAuthStore.getState();
    if (!userId) {
      get().stopPolling();
      return;
    }
    try {
      const count = await notificationService.getUnreadCount(userId);
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  },

  fetchNotifications: async () => {
    const { userId } = useAuthStore.getState();
    if (!userId || get().isFetching) return;
    set({ isFetching: true });
    try {
      const data = await notificationService.getNotifications(userId, 1, 20);
      set({ notifications: data.items || [] });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      set({ isFetching: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        const isUnread = notification && !notification.read;
        const newNotifications = state.notifications.filter((n) => n.id !== id);
        return {
          notifications: newNotifications,
          unreadCount: state.unreadCount - (isUnread ? 1 : 0),
        };
      });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  },

  markAllAsRead: async () => {
    const { userId } = useAuthStore.getState();
    if (!userId) return;
    try {
      await notificationService.markAllAsRead(userId);
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  },

  deleteNotification: async (id) => {
    try {
      await notificationService.deleteNotification(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  },

  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),
}));

export default useNotificationStore;

// Subscribe to auth store changes to start/stop polling
useAuthStore.subscribe((state, prevState) => {
  const { userId } = state;
  const { userId: prevUserId } = prevState;
  if (userId && !prevUserId) {
    const notificationStore = useNotificationStore.getState();
    notificationStore.startPolling();
    notificationStore.fetchNotifications();
  } else if (!userId && prevUserId) {
    const notificationStore = useNotificationStore.getState();
    notificationStore.stopPolling();
    notificationStore.setNotifications([]);
    notificationStore.setUnreadCount(0);
  }
});