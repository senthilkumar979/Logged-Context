import type { CurrencyCode, ThemeMode } from './preferencesTypes';

export const setTheme = (theme: ThemeMode) =>
  ({ type: 'SET_THEME' as const, payload: theme });

export const setCurrency = (currency: CurrencyCode) =>
  ({ type: 'SET_CURRENCY' as const, payload: currency });
