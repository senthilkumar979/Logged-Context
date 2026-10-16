interface ReduxDevToolsAction {
  type: string;
  [key: string]: unknown;
}

interface ReduxDevToolsMessage {
  type: string;
  state?: string;
  payload?: {
    type?: string;
    [key: string]: unknown;
  };
}

interface ReduxDevToolsConnection {
  init: (state: unknown) => void;
  send: (action: ReduxDevToolsAction, state: unknown) => void;
  subscribe: (listener: (message: ReduxDevToolsMessage) => void) => () => void;
  unsubscribe: () => void;
}

interface ReduxDevToolsExtension {
  connect: (options?: { name?: string }) => ReduxDevToolsConnection;
}

interface Window {
  __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevToolsExtension;
}
