export interface DevToolsConnection {
  init: (state: unknown) => void;
  send: (action: { type: string; [key: string]: unknown }, state: unknown) => void;
  subscribe: (listener: (message: ReduxDevToolsMessage) => void) => () => void;
  disconnect: () => void;
}

function createNoopConnection(): DevToolsConnection {
  return {
    init: () => undefined,
    send: () => undefined,
    subscribe: () => () => undefined,
    disconnect: () => undefined,
  };
}

export function connectDevTools(name: string): DevToolsConnection {
  if (!import.meta.env.DEV) return createNoopConnection();

  const extension = window.__REDUX_DEVTOOLS_EXTENSION__;
  if (!extension) return createNoopConnection();

  const connection = extension.connect({ name });

  return {
    init: (state) => connection.init(state),
    send: (action, state) => connection.send(action, state),
    subscribe: (listener) => connection.subscribe(listener),
    disconnect: () => connection.unsubscribe(),
  };
}

export function parseDevToolsState<TState>(
  message: ReduxDevToolsMessage,
): TState | undefined {
  if (!message.state) return undefined;

  try {
    return JSON.parse(message.state) as TState;
  } catch {
    return undefined;
  }
}

export function isTimeTravelMessage(message: ReduxDevToolsMessage): boolean {
  if (message.type !== 'DISPATCH') return false;

  const payloadType = message.payload?.type;
  return (
    payloadType === 'JUMP_TO_STATE' ||
    payloadType === 'JUMP_TO_ACTION' ||
    payloadType === 'RESET'
  );
}
