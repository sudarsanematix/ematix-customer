export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const spacing = {
  touchTarget: 44,
  gutterMobile: 16,
  marginMobile: 20,
  sheetPadding: 24,
  cardPadding: 16,
  stackXs: 4,
  stackSm: 8,
  stackMd: 12,
  stackLg: 16,
  stackXl: 24,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  sheet: 24,
  full: 9999,
} as const;

export const type = {
  headlineXl: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  headlineLg: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.52 },
  headlineMd: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  headlineSm: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  labelLg: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  labelMd: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  labelSm: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.22 },
  displayMetric: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.84 },
} as const;