import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  createLoggedStore,
  type LoggedStore,
} from './devtools/createLoggedStore';

export interface CreateLoggedContextOptions<TState, TAction> {
  name: string;
  reducer: (state: TState, action: TAction) => TState;
  initialState: TState;
}

export interface LoggedContextValue<TState, TAction> {
  state: TState;
  dispatch: (action: TAction) => void;
}

type EqualityFn<TSelected> = (a: TSelected, b: TSelected) => boolean;

export function createLoggedContext<TState, TAction>(
  options: CreateLoggedContextOptions<TState, TAction>,
) {
  const { name, reducer, initialState } = options;

  const StoreContext = createContext<LoggedStore<TState, TAction> | null>(null);

  const Provider = ({ children }: { children: ReactNode }) => {
    const [store] = useState(() =>
      createLoggedStore({ name, reducer, initialState }),
    );

    useEffect(() => {
      store.connectViewer();
      return () => {
        store.disconnectViewer();
      };
    }, [store]);

    return (
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    );
  };

  function useStoreApi(): LoggedStore<TState, TAction> {
    const store = useContext(StoreContext);
    if (store === null) {
      throw new Error(`Hooks must be used within ${name}.Provider`);
    }
    return store;
  }

  function useDispatch(): (action: TAction) => void {
    return useStoreApi().dispatch;
  }

  function useSelector<TSelected>(
    selector: (state: TState) => TSelected,
    isEqual: EqualityFn<TSelected> = Object.is,
  ): TSelected {
    const store = useStoreApi();
    const state = useSyncExternalStore(
      store.subscribe,
      store.getState,
      store.getState,
    );

    const selected = selector(state);
    const [cached, setCached] = useState(selected);

    // React-allowed: adjust derived state during render (no refs).
    if (!isEqual(cached, selected)) {
      setCached(selected);
      return selected;
    }

    return cached;
  }

  /** Full state + dispatch when you do not need a fine-grained selector. */
  function useContextValue(): LoggedContextValue<TState, TAction> {
    const store = useStoreApi();
    const state = useSyncExternalStore(
      store.subscribe,
      store.getState,
      store.getState,
    );

    return { state, dispatch: store.dispatch };
  }

  return {
    Provider,
    useSelector,
    useDispatch,
    useContext: useContextValue,
  };
}
