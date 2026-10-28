// Design tokens. Ink-navy for structure, one blue for actions,
// and green / amber / red reserved for attendance states only.
export const COLORS = {
  ink: '#0E2238',
  inkSoft: '#1B3550',
  primary: '#1F5FD6',
  primaryDark: '#1749A8',
  primaryTint: '#E6EEFC',
  background: '#F1F4F9',
  card: '#FFFFFF',
  border: '#DCE3EE',
  textPrimary: '#0E2238',
  textSecondary: '#5B6B7F',
  textMuted: '#8A97A8',
  textOnPrimary: '#FFFFFF',
  onInkMuted: '#A9BBD0',

  success: '#0F8F63',
  successTint: '#E3F5EC',
  warning: '#B66A0A',
  warningTint: '#FDF1DC',
  danger: '#C8312B',
  dangerTint: '#FCE8E7',
  neutralTint: '#E8ECF2',

  // kept for backwards compatibility with older screens
  surface: '#E6EEFC',
  shadow: '#0E2238',
  logo: '#FFFFFF',
} as const;

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const RADIUS = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 } as const;

export const TYPE = {
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

export const SHADOW = {
  shadowColor: '#0E2238',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 3,
} as const;
