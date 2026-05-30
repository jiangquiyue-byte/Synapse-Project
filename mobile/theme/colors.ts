/**
 * Material Design 3 (Material You) Color System
 * Based on Google's Material Design 3 color tokens
 */

// ── Primary ──────────────────────────────────────────────────────────────────
const primaryLight = '#1A73E8';
const onPrimaryLight = '#FFFFFF';
const primaryContainerLight = '#D3E3FD';
const onPrimaryContainerLight = '#041E49';

// ── Secondary ────────────────────────────────────────────────────────────────
const secondaryLight = '#5F6368';
const onSecondaryLight = '#FFFFFF';
const secondaryContainerLight = '#E8EAED';
const onSecondaryContainerLight = '#1F1F1F';

// ── Tertiary ─────────────────────────────────────────────────────────────────
const tertiaryLight = '#7D5260';
const onTertiaryLight = '#FFFFFF';
const tertiaryContainerLight = '#FFD8E4';
const onTertiaryContainerLight = '#31111D';

// ── Error ────────────────────────────────────────────────────────────────────
const errorLight = '#B3261E';
const onErrorLight = '#FFFFFF';
const errorContainerLight = '#F9DEDC';
const onErrorContainerLight = '#410E0B';

// ── Surface ──────────────────────────────────────────────────────────────────
const surfaceLight = '#FAFAFA';
const onSurfaceLight = '#1F1F1F';
const surfaceVariantLight = '#E8EAED';
const onSurfaceVariantLight = '#444746';
const surfaceContainerLowestLight = '#FFFFFF';
const surfaceContainerLowLight = '#F1F3F4';
const surfaceContainerLight = '#FFFFFF';
const surfaceContainerHighLight = '#E8EAED';
const surfaceContainerHighestLight = '#DFE2E5';

// ── Outline ──────────────────────────────────────────────────────────────────
const outlineLight = '#747775';
const outlineVariantLight = '#C4C7C5';

// ── Inverse ──────────────────────────────────────────────────────────────────
const inverseSurfaceLight = '#303030';
const inverseOnSurfaceLight = '#F2F2F2';
const inversePrimaryLight = '#A8C7FA';

// ── Scrim & Shadow ───────────────────────────────────────────────────────────
const scrimLight = '#000000';
const shadowLight = '#000000';

// ── Dark Theme ───────────────────────────────────────────────────────────────
const primaryDark = '#A8C7FA';
const onPrimaryDark = '#062E6F';
const primaryContainerDark = '#0842A0';
const onPrimaryContainerDark = '#D3E3FD';

const secondaryDark = '#C4C7C5';
const onSecondaryDark = '#2C2F31';
const secondaryContainerDark = '#404348';
const onSecondaryContainerDark = '#E8EAED';

const tertiaryDark = '#EFB8C8';
const onTertiaryDark = '#492532';
const tertiaryContainerDark = '#633B48';
const onTertiaryContainerDark = '#FFD8E4';

const errorDark = '#F2B8B5';
const onErrorDark = '#601410';
const errorContainerDark = '#8C1D18';
const onErrorContainerDark = '#F9DEDC';

const surfaceDark = '#1F1F1F';
const onSurfaceDark = '#E3E3E3';
const surfaceVariantDark = '#444746';
const onSurfaceVariantDark = '#C4C7C5';
const surfaceContainerLowestDark = '#0F1114';
const surfaceContainerLowDark = '#1F1F1F';
const surfaceContainerDark = '#252529';
const surfaceContainerHighDark = '#303034';
const surfaceContainerHighestDark = '#3B3B40';

const outlineDark = '#8E918F';
const outlineVariantDark = '#444746';

const inverseSurfaceDark = '#E3E3E3';
const inverseOnSurfaceDark = '#303030';
const inversePrimaryDark = '#0058D4';

const scrimDark = '#000000';
const shadowDark = '#000000';

// ── Color Palette ────────────────────────────────────────────────────────────
export const colors = {
  light: {
    primary: primaryLight,
    onPrimary: onPrimaryLight,
    primaryContainer: primaryContainerLight,
    onPrimaryContainer: onPrimaryContainerLight,
    secondary: secondaryLight,
    onSecondary: onSecondaryLight,
    secondaryContainer: secondaryContainerLight,
    onSecondaryContainer: onSecondaryContainerLight,
    tertiary: tertiaryLight,
    onTertiary: onTertiaryLight,
    tertiaryContainer: tertiaryContainerLight,
    onTertiaryContainer: onTertiaryContainerLight,
    error: errorLight,
    onError: onErrorLight,
    errorContainer: errorContainerLight,
    onErrorContainer: onErrorContainerLight,
    surface: surfaceLight,
    onSurface: onSurfaceLight,
    surfaceVariant: surfaceVariantLight,
    onSurfaceVariant: onSurfaceVariantLight,
    surfaceContainerLowest: surfaceContainerLowestLight,
    surfaceContainerLow: surfaceContainerLowLight,
    surfaceContainer: surfaceContainerLight,
    surfaceContainerHigh: surfaceContainerHighLight,
    surfaceContainerHighest: surfaceContainerHighestLight,
    outline: outlineLight,
    outlineVariant: outlineVariantLight,
    inverseSurface: inverseSurfaceLight,
    inverseOnSurface: inverseOnSurfaceLight,
    inversePrimary: inversePrimaryLight,
    scrim: scrimLight,
    shadow: shadowLight,
  },
  dark: {
    primary: primaryDark,
    onPrimary: onPrimaryDark,
    primaryContainer: primaryContainerDark,
    onPrimaryContainer: onPrimaryContainerDark,
    secondary: secondaryDark,
    onSecondary: onSecondaryDark,
    secondaryContainer: secondaryContainerDark,
    onSecondaryContainer: onSecondaryContainerDark,
    tertiary: tertiaryDark,
    onTertiary: onTertiaryDark,
    tertiaryContainer: tertiaryContainerDark,
    onTertiaryContainer: onTertiaryContainerDark,
    error: errorDark,
    onError: onErrorDark,
    errorContainer: errorContainerDark,
    onErrorContainer: onErrorContainerDark,
    surface: surfaceDark,
    onSurface: onSurfaceDark,
    surfaceVariant: surfaceVariantDark,
    onSurfaceVariant: onSurfaceVariantDark,
    surfaceContainerLowest: surfaceContainerLowestDark,
    surfaceContainerLow: surfaceContainerLowDark,
    surfaceContainer: surfaceContainerDark,
    surfaceContainerHigh: surfaceContainerHighDark,
    surfaceContainerHighest: surfaceContainerHighestDark,
    outline: outlineDark,
    outlineVariant: outlineVariantDark,
    inverseSurface: inverseSurfaceDark,
    inverseOnSurface: inverseOnSurfaceDark,
    inversePrimary: inversePrimaryDark,
    scrim: scrimDark,
    shadow: shadowDark,
  },
} as const;

export type ColorScheme = typeof colors.light;
export type ColorToken = keyof ColorScheme;
