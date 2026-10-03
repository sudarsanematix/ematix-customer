import { darkColors, lightColors } from './colors';

/**
 * Paired Mapbox basemaps. `navigation-day-v1` / `navigation-night-v1` are a
 * matched pair, so the two themes keep the same cartography and only the
 * palette changes. Both are stock styles: no `styles:read`/`styles:write`
 * token scope and no Studio-authored style ID to keep in sync.
 */
export const LIVE_MAP_LIGHT_STYLE = 'mapbox://styles/mapbox/navigation-day-v1';
export const LIVE_MAP_DARK_STYLE = 'mapbox://styles/mapbox/navigation-night-v1';

export type MapThemeTokens = {
  /** Lets the WebView resolve per-kind vehicle colors without a second lookup. */
  isDark: boolean;
  /** Basemap URL. `setTheme` only calls `map.setStyle` when this changes. */
  styleUrl: string;
  /** Page + host container backdrop. Visible while the map letterboxes. */
  base: string;
  /** Marker rings, pin cores and strokes that sit on top of the basemap. */
  onBase: string;
  /** Marker/vehicle drop shadow, alpha included. */
  shadow: string;
  /** Mapbox attribution text. */
  attributionFg: string;
  routeCasing: string;
  routeBase: string;
  routeDone: string;
  routeRest: string;
  /** Floating chips, cards and FABs drawn over the map by the screens. */
  glass: string;
  /** Higher-opacity variant for the large bottom sheets that cover the map. */
  glassStrong: string;
  glassBorder: string;
  /** Vignette/scrim gradient stops that fade the map into a sheet. */
  scrimFrom: string;
  scrimTo: string;
  scrimToSoft: string;
  /** Full-map brand tint. */
  brandTint: string;
  /** Soft brand tint for icon circles and row backgrounds. */
  brandTintSoft: string;
  /** Tinted panel behind progress/track UI. */
  tintPanel: string;
  tintPanelTrack: string;
  success: string;
  successTint: string;
  /** Glyph color for icons drawn on top of a `primary` fill. */
  onPrimary: string;
  /**
   * Translucent wash for nested chips inside a filled banner. It must read as
   * a deepening of whatever container it sits on, so it flips with the theme.
   */
  washStrong: string;
  washSubtle: string;
};

const LIGHT: MapThemeTokens = {
  isDark: false,
  styleUrl: LIVE_MAP_LIGHT_STYLE,
  base: '#e8ecef',
  onBase: '#ffffff',
  shadow: 'rgba(0, 0, 0, 0.35)',
  attributionFg: 'rgba(0, 0, 0, 0.65)',
  routeCasing: '#ffffff',
  routeBase: '#94a3b8',
  routeDone: lightColors.primary,
  routeRest: lightColors.primary,
  glass: 'rgba(255, 255, 255, 0.95)',
  glassStrong: 'rgba(252, 249, 248, 0.97)',
  glassBorder: 'rgba(0, 0, 0, 0.04)',
  scrimFrom: 'rgba(252, 249, 248, 0.7)',
  scrimTo: lightColors.surface,
  scrimToSoft: 'rgba(252, 249, 248, 0.8)',
  brandTint: 'rgba(0, 33, 124, 0.10)',
  brandTintSoft: 'rgba(0, 33, 124, 0.08)',
  tintPanel: 'rgba(234, 241, 255, 0.7)',
  tintPanelTrack: 'rgba(180, 197, 255, 0.4)',
  success: '#248A3D',
  successTint: 'rgba(52, 199, 89, 0.12)',
  onPrimary: lightColors.onPrimary,
  washStrong: 'rgba(0, 33, 124, 0.6)',
  washSubtle: 'rgba(0, 33, 124, 0.4)',
};

const DARK: MapThemeTokens = {
  isDark: true,
  styleUrl: LIVE_MAP_DARK_STYLE,
  base: darkColors.surfaceContainerLowest,
  onBase: darkColors.onSurface,
  shadow: 'rgba(0, 0, 0, 0.6)',
  attributionFg: 'rgba(236, 238, 247, 0.7)',
  // The casing has to invert: a white halo disappears into a dark basemap.
  routeCasing: darkColors.surfaceDim,
  routeBase: '#5b6480',
  routeDone: darkColors.primary,
  routeRest: darkColors.primary,
  glass: 'rgba(37, 37, 51, 0.94)',
  glassStrong: 'rgba(29, 29, 41, 0.97)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  scrimFrom: 'rgba(18, 18, 26, 0.75)',
  scrimTo: darkColors.surface,
  scrimToSoft: 'rgba(18, 18, 26, 0.8)',
  brandTint: 'rgba(184, 196, 255, 0.06)',
  brandTintSoft: 'rgba(184, 196, 255, 0.14)',
  tintPanel: 'rgba(26, 34, 74, 0.7)',
  tintPanelTrack: 'rgba(184, 196, 255, 0.24)',
  success: '#5edb8b',
  successTint: 'rgba(94, 219, 139, 0.16)',
  onPrimary: darkColors.onPrimary,
  washStrong: 'rgba(0, 0, 0, 0.55)',
  washSubtle: 'rgba(0, 0, 0, 0.35)',
};

export const MAP_THEMES: Record<'light' | 'dark', MapThemeTokens> = {
  light: LIGHT,
  dark: DARK,
};

/** Frozen so callers can memoise on identity without the map reloading. */
export function buildMapTheme(isDark: boolean): MapThemeTokens {
  return isDark ? DARK : LIGHT;
}
