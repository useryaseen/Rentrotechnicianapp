/**
 * Technician identity resolution.
 *
 * ⚠️ KNOWN GAP (spec §14 item 4): the web app hard-codes these usernames in
 * `src/config/technicianProfiles.js`; the backend has no identity endpoint yet.
 * The table is ported as-is so the mobile app behaves identically. When the
 * backend exposes `{ techId, apiUsername, displayName, zone }` for the
 * authenticated user, feed that object into `resolveTechnicianProfile()` as
 * `serverProfile` and it will win over the table (see `src/api/authService.js`).
 */
export const TECHNICIAN_PROFILES = [
  {
    techId: '001',
    displayName: 'Qamar',
    apiUsername: 'Qamar',
    logins: ['Qamar', 'Mohd Yaseen', 'QamarTech'],
  },
  {
    techId: '013',
    displayName: 'raza',
    apiUsername: 'Raza',
    logins: ['Raza'],
  },
  {
    techId: '016',
    displayName: 'Ashraf',
    apiUsername: 'Ashraf',
    logins: ['Ashraf'],
  },
  {
    techId: '019',
    displayName: 'anil',
    apiUsername: 'Anil',
    logins: ['Anil'],
  },
];

/** Case/space insensitive key so "Mohd  Yaseen" and "mohd yaseen" match. */
export function normalizeLoginName(username) {
  return String(username ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

const PROFILE_BY_LOGIN = TECHNICIAN_PROFILES.reduce((map, profile) => {
  profile.logins.forEach((login) => {
    map[normalizeLoginName(login)] = profile;
  });
  return map;
}, {});

/**
 * @param {string} username raw login username (JWT name claim fallback)
 * @returns {{techId: string, displayName: string, apiUsername: string}|null}
 */
export function getTechnicianProfile(username) {
  if (!username) return null;
  const found = PROFILE_BY_LOGIN[normalizeLoginName(username)];
  if (!found) return null;
  return {
    techId: found.techId,
    displayName: found.displayName,
    apiUsername: found.apiUsername,
  };
}

export function isTechnicianUser(username) {
  return Boolean(getTechnicianProfile(username));
}

/**
 * Prefers a server-provided profile (future identity endpoint) and falls back
 * to the hard-coded table.
 *
 * @param {string} username
 * @param {{techId?: string, apiUsername?: string, displayName?: string}|null} serverProfile
 */
export function resolveTechnicianProfile(username, serverProfile) {
  if (serverProfile && (serverProfile.techId || serverProfile.apiUsername)) {
    const fallback = getTechnicianProfile(username) ?? {};
    return {
      techId: serverProfile.techId || fallback.techId || null,
      apiUsername: serverProfile.apiUsername || fallback.apiUsername || username || null,
      displayName: serverProfile.displayName || fallback.displayName || username || 'Technician',
    };
  }
  return getTechnicianProfile(username);
}

export default TECHNICIAN_PROFILES;
