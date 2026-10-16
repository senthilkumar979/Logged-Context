import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
    const storeRef = useRef<LoggedStore<TState, TAction> | null>(null);
    if (storeRef.current === null) {
      storeRef.current = createLoggedStore({ name, reducer, initialState });
    }
    const store = storeRef.current;

    useEffect(() => () => store.destroy(), [store]);

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
    const selectorRef = useRef(selector);
    const isEqualRef = useRef(isEqual);
    const selectedRef = useRef<TSelected>(selector(store.getState()));

    selectorRef.current = selector;
    isEqualRef.current = isEqual;

    const subscribe = useMemo(() => store.subscribe, [store]);

    const getSnapshot = () => {
      const nextSelected = selectorRef.current(store.getState());
      if (isEqualRef.current(selectedRef.current, nextSelected)) {
        return selectedRef.current;
      }
      selectedRef.current = nextSelected;
      return nextSelected;
    };

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
