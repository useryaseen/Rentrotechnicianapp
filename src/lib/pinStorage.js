/**
 * Persistence for pinned tasks in My Tasks.
 *
 * Key: pm_pinned_tasks (array of task keys: uuid || schVrno || vrNo)
 *
 * Uses AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@rentro_tech_pm_pinned_tasks';

/**
 * Get the list of pinned task keys.
 * @returns {Promise<string[]>}
 */
export const getPinned = async () => {
  const json = await AsyncStorage.getItem(KEY);
  return json ? JSON.parse(json) : [];
};

/**
 * Set the list of pinned task keys.
 * @param {string[]} keys
 */
export const setPinned = async (keys) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(keys));
};

/**
 * Toggle a task's pinned state.
 * @param {string} key - The task key to toggle
 */
export const togglePinned = async (key) => {
  const pins = await getPinned();
  const index = pins.indexOf(key);
  if (index >= 0) {
    // Remove
    await setPinned(pins.filter((_, i) => i !== index));
  } else {
    // Add
    await setPinned([...pins, key]);
  }
};

/**
 * Clear all pinned tasks.
 */
export const clearPinned = async () => {
  await AsyncStorage.removeItem(KEY);
};

export default {
  getPinned,
  setPinned,
  togglePinned,
  clearPinned,
};