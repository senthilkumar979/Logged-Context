import { useEffect, useState, useSyncExternalStore } from 'react';
import { createLoggedStore } from '../lib/devtools/createLoggedStore';

export interface UseReducerWithDevToolsOptions {
  name: string;
}

/**
 * Low-level adapter: same return shape as useReducer, backed by createLoggedStore.
 * Prefer createLoggedContext().useSelector / useDispatch for feature contexts.
 */
export function useReducerWithDevTools<TState, TAction>(
  reducer: (state: TState, action: TAction) => TState,
  initialState: TState,
  options: UseReducerWithDevToolsOptions,
): [TState, (action: TAction) => void] {
  const { name } = options;

  const [store] = useState(() =>
    createLoggedStore({ name, reducer, initialState }),
  );

  useEffect(() => () => store.destroy(), [store]);

  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  return [state, store.dispatch];
}
