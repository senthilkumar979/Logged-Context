import { setCurrency, setTheme } from './preferencesActions';
import {
  usePreferencesDispatch,
  usePreferencesSelector,
} from './PreferencesContext';

export const PreferencesDemo = () => {
  const theme = usePreferencesSelector((state) => state.theme);
  const currency = usePreferencesSelector((state) => state.currency);
  const dispatch = usePreferencesDispatch();

  return (
    <section className="cart preferences">
      <header className="cart__header">
        <h1>Preferences Context</h1>
        <p>
          Uses <code>usePreferencesSelector</code> /{' '}
          <code>usePreferencesDispatch</code>. Or grab both via{' '}
          <code>usePreferencesContext()</code>. DevTools:{' '}
          <strong>Preferences</strong>.
        </p>
      </header>

      <div className="cart__panel">
        <div className="prefs__row">
          <span>Theme</span>
          <div className="prefs__actions">
            <button
              type="button"
              className={theme === 'light' ? 'prefs__active' : undefined}
              onClick={() => dispatch(setTheme('light'))}
            >
              Light
            </button>
            <button
              type="button"
              className={theme === 'dark' ? 'prefs__active' : undefined}
              onClick={() => dispatch(setTheme('dark'))}
            >
              Dark
            </button>
          </div>
        </div>

        <div className="prefs__row">
          <span>Currency</span>
          <div className="prefs__actions">
            <button
              type="button"
              className={currency === 'USD' ? 'prefs__active' : undefined}
              onClick={() => dispatch(setCurrency('USD'))}
            >
              USD
            </button>
            <button
              type="button"
              className={currency === 'EUR' ? 'prefs__active' : undefined}
              onClick={() => dispatch(setCurrency('EUR'))}
            >
              EUR
            </button>
          </div>
        </div>

        <p className="cart__total">
          Selected: <strong>{theme}</strong> / <strong>{currency}</strong>
        </p>
      </div>
    </section>
  );
};
