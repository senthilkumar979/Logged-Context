import { createLoggedContext } from '../../lib/createLoggedContext';
import { preferencesReducer } from './preferencesReducer';
import { initialPreferencesState } from './preferencesTypes';

const {
  Provider: PreferencesProvider,
  useSelector: usePreferencesSelector,
  useDispatch: usePreferencesDispatch,
  useContext: usePreferencesContext,
} = createLoggedContext({
  name: 'Preferences',
  reducer: preferencesReducer,
  initialState: initialPreferencesState,
});

export {
  PreferencesProvider,
  usePreferencesSelector,
  usePreferencesDispatch,
  usePreferencesContext,
};
