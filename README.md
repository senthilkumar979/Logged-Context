# Logged Context

A Vite + React 19 + TypeScript demo that keeps application state in **React Context**, updates it with **reducers**, and **logs every dispatch** (action type, payload, previous/next state) during local development.

There is no Redux library in this project. State lives entirely in Context. The browser’s Redux DevTools extension is used only as an optional viewer for those logs.

---

## What this project demonstrates

1. **Multiple feature contexts** (Cart and Preferences), each with its own state and reducer.
2. **Predictable updates** via `(state, action) => nextState` reducers and typed action creators.
3. **Reusable hooks** per feature: selector, dispatch, or full context (`state` + `dispatch`).
4. **Dev-only logging**: console groups + DevTools timeline when running locally; silent in production.

---

## Quick start

```bash
npm install
npm run dev
```

Then:

1. Open the app and use the Cart / Preferences panels.
2. Open the browser console — each dispatch is grouped with action, prev state, and next state.
3. (Optional) Install the [Redux DevTools](https://github.com/reduxjs/redux-devtools) browser extension to inspect the same trail under instances named `Cart` and `Preferences`. Time-travel (jump / reset) syncs back into Context state in dev.

---

## Mental model

```text
Component
   │  dispatch(action)
   ▼
Logged store (per feature)
   │  1. nextState = reducer(prevState, action)
   │  2. log (dev only): type, payload, prev, next
   │  3. notify subscribers
   ▼
useXxxSelector / useXxxContext  →  UI re-renders
```

Each feature owns:

| Piece | Role |
| --- | --- |
| **State** | Plain object (e.g. cart items, theme) |
| **Action** | `{ type, payload? }` describing *what happened* |
| **Reducer** | Pure function that returns the next state |
| **Context + hooks** | How components read state and dispatch actions |
| **Logging** | Observability around every dispatch (dev only) |

---

## Context

React Context shares state down the tree without prop drilling. This app does **not** put a single giant value in one context. Instead, each feature gets its own provider and hooks.

### Nesting providers

```tsx
// src/App.tsx
<CartProvider>
  <PreferencesProvider>
    <main>
      <CartDemo />
      <PreferencesDemo />
    </main>
  </PreferencesProvider>
</CartProvider>
```

Cart and Preferences are independent. A Preferences update does not force Cart consumers to re-render (and vice versa), as long as components subscribe with selectors for the data they need.

### Creating a feature context

[`createLoggedContext`](src/lib/createLoggedContext.tsx) wires a store into a React Provider and returns hooks. Features rename those exports:

```tsx
// src/features/preferences/PreferencesContext.tsx
const {
  Provider: PreferencesProvider,
  useSelector: usePreferencesSelector,
  useDispatch: usePreferencesDispatch,
  useContext: usePreferencesContext,
} = createLoggedContext({
  name: 'Preferences',       // used in console + DevTools
  reducer: preferencesReducer,
  initialState: initialPreferencesState,
});
```

### How components consume it

**Fine-grained reads** (preferred when you only need a slice of state):

```tsx
const theme = usePreferencesSelector((state) => state.theme);
const currency = usePreferencesSelector((state) => state.currency);
const dispatch = usePreferencesDispatch();
```

**Full state + dispatch** in one call:

```tsx
const { state, dispatch } = usePreferencesContext();
// state.theme, state.currency, ...
```

`useSelector` uses `useSyncExternalStore` under the hood, so a component re-renders only when the **selected** value changes (`Object.is` by default).

### Under the hood

- The Provider creates a **logged store** once ([`createLoggedStore`](src/lib/devtools/createLoggedStore.ts)).
- The store is passed through React Context.
- Hooks read from that store (`getState`, `subscribe`, `dispatch`).

You rarely touch the store API directly; the feature hooks are the public surface.

---

## Reducer

A reducer is a pure function:

```ts
(state: State, action: Action) => State
```

Given the same state and action, it always returns the same next state. No API calls, no `console.log` inside the reducer — side effects (including logging) live outside.

### Action shape

Actions are plain objects with a `type` and optional `payload`:

```ts
// src/features/cart/cartActions.ts
export const addItem = (payload: Omit<CartItem, 'quantity'>) =>
  ({ type: 'ADD_ITEM' as const, payload });

export const removeItem = (id: string) =>
  ({ type: 'REMOVE_ITEM' as const, payload: { id } });

export const clearCart = () => ({ type: 'CLEAR' as const });
```

Components dispatch creators, not raw strings:

```tsx
dispatch(addItem(product));
dispatch(clearCart());
```

### Example reducer (Cart)

```ts
// src/features/cart/cartReducer.ts
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      // return new state with item added / quantity bumped
    case 'REMOVE_ITEM':
      // return new state with item removed / quantity decreased
    case 'CLEAR':
      return { items: [] };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
```

Rules of thumb:

- Treat `state` as immutable — return a **new** object/array when something changes.
- Handle every action type (the `never` default catches missing cases in TypeScript).
- Keep business rules in the reducer; keep UI in components.

Preferences follows the same pattern with `SET_THEME` and `SET_CURRENCY`.

---

## Logging

Every successful dispatch goes through the logged store. In **development** only, that path:

1. Runs the reducer to compute `nextState`.
2. Writes a **console group** with context name, action, previous state, and next state.
3. Sends the same action/state to the **browser DevTools extension** (if installed), under the context `name` (e.g. `Cart`, `Preferences`).
4. Supports time-travel messages from the extension (jump / reset) back into Context state.

### Console output

Implemented in [`logContextAction`](src/lib/devtools/logContextAction.ts):

- Collapsed group labeled with context name + action type
- `action` — full action object (type + payload)
- `prev state` — state before the reducer ran
- `next state` — state after the reducer ran

### DevTools extension bridge

[`connectDevTools`](src/lib/devtools/connectDevTools.ts) talks to `window.__REDUX_DEVTOOLS_EXTENSION__` when present. This is a **browser extension API**, not an npm Redux dependency. If the extension is missing, the app still runs; only the viewer connection is a no-op.

### Production behavior

Gated by `import.meta.env.DEV` (Vite):

| Environment | Console logs | DevTools connect / time-travel |
| --- | --- | --- |
| `npm run dev` (local) | Yes | Yes (if extension installed) |
| `npm run build` / production | No | No |

In production, `dispatch` only runs the reducer and notifies subscribers — no logging overhead.

---

## Project layout

```text
src/
  lib/
    createLoggedContext.tsx      # Provider + useSelector / useDispatch / useContext
    devtools/
      createLoggedStore.ts       # getState, dispatch, subscribe + logging
      logContextAction.ts        # console groups
      connectDevTools.ts         # optional browser extension bridge
  hooks/
    useReducerWithDevTools.ts    # low-level [state, dispatch] adapter
  features/
    cart/                        # types, actions, reducer, context, demo UI
    preferences/                 # same structure
  App.tsx                        # nests feature providers
```

### Demo features

| Feature | Actions | Hooks |
| --- | --- | --- |
| Cart | `ADD_ITEM`, `REMOVE_ITEM`, `CLEAR` | `useCartSelector`, `useCartDispatch`, `useCartContext` |
| Preferences | `SET_THEME`, `SET_CURRENCY` | `usePreferencesSelector`, `usePreferencesDispatch`, `usePreferencesContext` |

---

## Adding another feature context

1. Define `types`, `actions`, and `reducer` under `src/features/<name>/`.
2. Create the context module:

```tsx
const {
  Provider: OrdersProvider,
  useSelector: useOrdersSelector,
  useDispatch: useOrdersDispatch,
  useContext: useOrdersContext,
} = createLoggedContext({
  name: 'Orders',
  reducer: ordersReducer,
  initialState,
});

export {
  OrdersProvider,
  useOrdersSelector,
  useOrdersDispatch,
  useOrdersContext,
};
```

3. Wrap the app (or a subtree) with `OrdersProvider`.
4. In components: select what you need, dispatch action creators, watch the console in local dev.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local server with logging + DevTools wiring enabled |
| `npm run build` | Production build (logging disabled) |
| `npm run preview` | Preview the production build |

---

## Summary

- **Context** shares per-feature state via providers and typed hooks.
- **Reducers** apply actions to produce the next state in a pure, testable way.
- **Logging** records action type, payload, and prev/next state in local development only, optionally visible in the browser DevTools extension.
