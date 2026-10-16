import { useEffect, useRef, useSyncExternalStore } from 'react';
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
  const storeRef = useRef<ReturnType<
    typeof createLoggedStore<TState, TAction>
  > | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createLoggedStore({ name, reducer, initialState });
  }

  const store = storeRef.current;

  useEffect(() => () => store.destroy(), [store]);

  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  return [state, store.dispatch];
}
