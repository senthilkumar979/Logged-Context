export type ThemeMode = 'light' | 'dark';
export type CurrencyCode = 'USD' | 'EUR';

export interface PreferencesState {
  theme: ThemeMode;
  currency: CurrencyCode;
}

export type PreferencesAction =
  | { type: 'SET_THEME'; payload: ThemeMode }
  | { type: 'SET_CURRENCY'; payload: CurrencyCode };

export const initialPreferencesState: PreferencesState = {
  theme: 'light',
  currency: 'USD',
};
