/**
 * Design tokens for the technician app.
 *
 * Field work happens in sunlight, with gloves, on budget Android devices, so:
 *  - body text is never smaller than 16,
 *  - every tappable target is at least 44pt tall,
 *  - colours keep a strong contrast against a near-white surface.
 */

export const colors = {
  primary: '#1d4ed8',
  primaryDark: '#1e3a8a',
  primarySoft: '#dbeafe',
  loginPrimary: 'rgb(140, 163, 226)',

  ink: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',

  surface: '#ffffff',
  background: '#f1f5f9',
  border: '#e2e8f0',
  divider: '#eef2f7',

  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  amberDark: '#b45309',

  sky: '#0ea5e9',
  skySoft: '#e0f2fe',
  skyDark: '#0369a1',

  emerald: '#10b981',
  emeraldSoft: '#d1fae5',
  emeraldDark: '#047857',

  purple: '#8b5cf6',
  purpleSoft: '#ede9fe',

  orange: '#f97316',
  orangeSoft: '#ffedd5',

  rose: '#f43f5e',
  roseSoft: '#ffe4e6',

  slateSoft: '#e2e8f0',
  slateDark: '#475569',

  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  success: '#059669',
  successSoft: '#d1fae5',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  info: '#0284c7',
  infoSoft: '#e0f2fe',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  body: 16,
  lg: 18,
  xl: 22,
  xxl: 26,
};

/**
 * Plus Jakarta Sans, loaded in `app/_layout.tsx`.
 * With custom fonts each weight is its own family — use these instead of `fontWeight`
 * (Android ignores `fontWeight` on custom families).
 */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};

export const touchTarget = 44;

export const shadows = {
  card: {
    shadowColor: '#1e293b',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sheet: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
};

export default { colors, spacing, radius, fontSize, fonts, shadows, touchTarget };
