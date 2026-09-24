/**
 * Local persistence for task-related state.
 *
 * Mirrors the web app's localStorage keys:
 *   - pm_active_task: { taskUuid, endTaskUuid, taskName, startedAt }
 *   - pm_last_end_task: { endTaskUuid, endedAt }
 *   - pm_pinned_tasks: string[] (array of task keys: uuid || schVrno || vrNo)
 *
 * Uses AsyncStorage (via @react-native-async-storage/async-storage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@rentro_tech_';

const ACTIVE_TASK_KEY = `${PREFIX}pm_active_task`;
const LAST_END_TASK_KEY = `${PREFIX}pm_last_end_task`;
const PINNED_TASKS_KEY = `${PREFIX}pm_pinned_tasks`;

/**
 * Get the currently active task (if any).
 * @returns {Promise<{ taskUuid: string, endTaskUuid: string, taskName: string, startedAt: string } | null>}
 */
export const getActiveTask = async () => {
  const json = await AsyncStorage.getItem(ACTIVE_TASK_KEY);
  return json ? JSON.parse(json) : null;
};

/**
 * Set the active task.
 * @param {Object} task - { taskUuid, endTaskUuid, taskName, startedAt }
 */
export const setActiveTask = async (task) => {
  await AsyncStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(task));
};

/**
 * Clear the active task (after a successful end or cancel).
 */
export const clearActiveTask = async () => {
  await AsyncStorage.removeItem(ACTIVE_TASK_KEY);
};

/**
 * Get the last ended task (for showing a confirmation banner).
 * @returns {Promise<{ endTaskUuid: string, endedAt: string } | null>}
 */
export const getLastEndTask = async () => {
  const json = await AsyncStorage.getItem(LAST_END_TASK_KEY);
  return json ? JSON.parse(json) : null;
};

/**
 * Save the last ended task.
 * @param {Object} task - { endTaskUuid, endedAt }
 */
export const saveLastEndTask = async (task) => {
  await AsyncStorage.setItem(LAST_END_TASK_KEY, JSON.stringify(task));
};

/**
 * Get the list of pinned task keys.
 * @returns {Promise<string[]>}
 */
export const getPinnedTasks = async () => {
  const json = await AsyncStorage.getItem(PINNED_TASKS_KEY);
  return json ? JSON.parse(json) : [];
};

/**
 * Set the list of pinned task keys.
 * @param {string[]} keys - Array of task keys (uuid || schVrno || vrNo)
 */
export const setPinnedTasks = async (keys) => {
  await AsyncStorage.setItem(PINNED_TASKS_KEY, JSON.stringify(keys));
};

/**
 * Toggle a task's pinned state.
 * @param {string} key - The task key to toggle
 */
export const togglePinnedTask = async (key) => {
  const pins = await getPinnedTasks();
  const index = pins.indexOf(key);
  if (index >= 0) {
    // Remove
    await setPinnedTasks(pins.filter((_, i) => i !== index));
  } else {
    // Add
    await setPinnedTasks([...pins, key]);
  }
};

export default {
  getActiveTask,
  setActiveTask,
  clearActiveTask,
  getLastEndTask,
  saveLastEndTask,
  getPinnedTasks,
  setPinnedTasks,
  togglePinnedTask,
};