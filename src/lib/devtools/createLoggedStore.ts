import {
  connectDevTools,
  isTimeTravelMessage,
  parseDevToolsState,
  type DevToolsConnection,
} from './connectDevTools';
import { logContextAction } from './logContextAction';

export interface CreateLoggedStoreOptions<TState, TAction> {
  name: string;
  reducer: (state: TState, action: TAction) => TState;
  initialState: TState;
}

export interface LoggedStore<TState, TAction> {
  getState: () => TState;
  dispatch: (action: TAction) => void;
  subscribe: (listener: () => void) => () => void;
  destroy: () => void;
}

interface DevToolsAction {
  type: string;
  [key: string]: unknown;
}

function toDevToolsAction(action: unknown): DevToolsAction {
  if (action !== null && typeof action === 'object' && 'type' in action) {
    return action as DevToolsAction;
  }

  return { type: 'UNKNOWN', payload: action };
}

const isDev = import.meta.env.DEV;

export function createLoggedStore<TState, TAction>(
  options: CreateLoggedStoreOptions<TState, TAction>,
): LoggedStore<TState, TAction> {
  const { name, reducer, initialState } = options;

  let state = initialState;
  const listeners = new Set<() => void>();
  let connection: DevToolsConnection | null = null;
  let unsubscribeDevTools: (() => void) | null = null;

  function notify(): void {
    listeners.forEach((listener) => listener());
  }

  function setState(nextState: TState): void {
    state = nextState;
    notify();
  }

  function getState(): TState {
    return state;
  }

  function dispatch(action: TAction): void {
    const prevState = state;
    const nextState = reducer(prevState, action);

    // Console + DevTools only in local/dev builds (stripped behavior in production).
    if (isDev) {
      logContextAction({ name, action, prevState, nextState });
      connection?.send(toDevToolsAction(action), nextState);
    }

    setState(nextState);
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function destroy(): void {
    if (isDev) {
      unsubscribeDevTools?.();
      unsubscribeDevTools = null;
      connection?.disconnect();
      connection = null;
    }
    listeners.clear();
  }

  if (isDev) {
    connection = connectDevTools(name);
    connection.init(initialState);

    unsubscribeDevTools = connection.subscribe((message) => {
      if (!isTimeTravelMessage(message)) return;

      if (message.payload?.type === 'RESET') {
        setState(initialState);
        connection?.init(initialState);
        return;
      }

      const nextState = parseDevToolsState<TState>(message);
      if (nextState === undefined) return;

      setState(nextState);
    });
  }

  return {
    getState,
    dispatch,
    subscribe,
    destroy,
  };
}
