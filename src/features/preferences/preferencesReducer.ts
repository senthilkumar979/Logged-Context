import type { PreferencesAction, PreferencesState } from './preferencesTypes';

export function preferencesReducer(
  state: PreferencesState,
  action: PreferencesAction,
): PreferencesState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'SET_CURRENCY':
      return { ...state, currency: action.payload };

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
