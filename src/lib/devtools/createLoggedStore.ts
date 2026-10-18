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
  /** Connect console/DevTools viewer (call from useEffect setup). */
  connectViewer: () => void;
  /** Disconnect viewer (call from useEffect cleanup — Safe with Strict Mode). */
  disconnectViewer: () => void;
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

  function connectViewer(): void {
    if (!isDev || connection) return;

    connection = connectDevTools(name);
    connection.init(state);

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

  function disconnectViewer(): void {
    if (!isDev) return;

    unsubscribeDevTools?.();
    unsubscribeDevTools = null;
    connection?.disconnect();
    connection = null;
  }

  function destroy(): void {
    disconnectViewer();
    listeners.clear();
  }

  return {
    getState,
    dispatch,
    subscribe,
    connectViewer,
    disconnectViewer,
    destroy,
  };
}
