# How `createLoggedContext` works

This document explains [`src/lib/createLoggedContext.tsx`](../src/lib/createLoggedContext.tsx) and the helpers it depends on, in plain English.

**Audience:** engineers who need to use or maintain feature contexts (Cart, Preferences, etc.).

**What this is not:** Redux Toolkit, or a Redux store. State lives in React Context. We only use the Redux DevTools *browser extension* as an optional viewer while developing.

---

## The problem we solved

We have several feature areas (Cart, Preferences, …). Each needs:

1. Shared state for a subtree of the UI  
2. Updates through clear **actions** (not scattered `setState` calls)  
3. Easy hooks in components: read a slice of state, or dispatch  
4. In local development: see **what happened** (action type, payload, old state, new state) in the console and optionally in Redux DevTools  

Doing that by hand for every feature would repeat a lot of boilerplate.  
`createLoggedContext` is a **factory**: you pass a name, a reducer, and initial state; it gives you a Provider and hooks.

---

## Big picture

```text
createLoggedContext({ name, reducer, initialState })
        │
        ├── Provider          → creates a logged store, puts it in React Context
        ├── useSelector       → read one piece of state
        ├── useDispatch       → send an action
        └── useContext        → get { state, dispatch } together
                │
                ▼
        createLoggedStore(...)     ← actual state + dispatch + logging
                │
                ├── logContextAction(...)     ← console (dev only)
                └── connectDevTools(...)      ← browser extension (dev only)
```

When a component calls `dispatch(addItem(...))`:

1. The store runs the **reducer** → new state  
2. In **dev**, it logs to the console and sends the update to DevTools  
3. Subscribed components re-render with the new data  

---

## How a feature uses it

Example from Cart ([`src/features/cart/CartContext.tsx`](../src/features/cart/CartContext.tsx)):

```tsx
const {
  Provider: CartProvider,
  useSelector: useCartSelector,
  useDispatch: useCartDispatch,
  useContext: useCartContext,
} = createLoggedContext({
  name: 'Cart',
  reducer: cartReducer,
  initialState: initialCartState,
});
```

We rename the generic returns so components get clear names:

| Factory return | Exported as (Cart) | Exported as (Preferences) |
| --- | --- | --- |
| `Provider` | `CartProvider` | `PreferencesProvider` |
| `useSelector` | `useCartSelector` | `usePreferencesSelector` |
| `useDispatch` | `useCartDispatch` | `usePreferencesDispatch` |
| `useContext` | `useCartContext` | `usePreferencesContext` |

In a component:

```tsx
const theme = usePreferencesSelector((state) => state.theme);
const dispatch = usePreferencesDispatch();

// or both at once:
const { state, dispatch } = usePreferencesContext();
```

---

## What you pass into `createLoggedContext`

```ts
createLoggedContext({
  name: string,           // Label in console + DevTools (e.g. "Cart")
  reducer,                // (state, action) => nextState
  initialState,           // Starting state
});
```

- **`name`** — human-readable. Shows up in console groups and as the DevTools instance name.  
- **`reducer`** — pure function. Given current state + an action, returns the next state. No API calls, no logging inside the reducer.  
- **`initialState`** — state before any actions run.

---

## Inside `createLoggedContext.tsx`

### React imports (from `'react'`)

| Import | Why we use it |
| --- | --- |
| `createContext` | Creates a React Context that will hold the **store** (not the raw state object). |
| `useContext` | Lets hooks read that store from the nearest Provider. |
| `useState` | Creates the store **once** when the Provider mounts (lazy initializer). Also used to cache the selected value in `useSelector`. |
| `useEffect` | Connects / disconnects the DevTools viewer when the Provider mounts / unmounts (works with React Strict Mode). |
| `useSyncExternalStore` | Subscribes a component to store updates in a React-approved way (avoids tearing; works with concurrent features). |
| `ReactNode` | TypeScript type for `children` of the Provider. |

### Our import

| Import | Why we use it |
| --- | --- |
| `createLoggedStore` | Builds the real store: `getState`, `dispatch`, `subscribe`, logging, DevTools. |
| `LoggedStore` | TypeScript type for that store object. |

---

## Step by step: what the factory builds

### 1. A private React Context

```ts
const StoreContext = createContext<LoggedStore | null>(null);
```

This Context holds the **store API**, not just state. That way dispatch stays stable and we can subscribe properly.

Each call to `createLoggedContext` creates its **own** Context. Cart and Preferences do not share the same Context object.

### 2. `Provider`

When you render `<CartProvider>`:

1. **`useState(() => createLoggedStore(...))`**  
   Creates one store for this Provider’s lifetime. The function form of `useState` runs only on the first mount (important for React 19 — we avoid writing refs during render).

2. **`useEffect` → `connectViewer` / `disconnectViewer`**  
   - On mount (and after Strict Mode’s remount cycle): start logging to DevTools.  
   - On cleanup: disconnect.  
   Strict Mode in development runs setup → cleanup → setup; reconnecting here is why DevTools keeps working with Strict Mode on.

3. **Renders**  
   `<StoreContext.Provider value={store}>{children}</StoreContext.Provider>`  
   Everything under this Provider can use the feature hooks.

### 3. `useStoreApi` (internal)

Not exported. Used by the other hooks.

- Reads the store from Context.  
- If there is no Provider above, throws a clear error:  
  `Hooks must be used within Cart.Provider` (name comes from your options).

### 4. `useDispatch`

Returns `store.dispatch`.

Components call:

```ts
dispatch({ type: 'ADD_ITEM', payload: product });
// or, better, an action creator:
dispatch(addItem(product));
```

### 5. `useSelector(selector, isEqual?)`

Used to read **part** of the state:

```ts
const items = useCartSelector((state) => state.items);
```

What it does:

1. Gets the store.  
2. Subscribes to the full store with `useSyncExternalStore` (re-renders when the store notifies).  
3. Runs your `selector` on the current state.  
4. Keeps a cached selected value; if `isEqual(cached, selected)` is true (default `Object.is`), it returns the cached value so referential stability is preserved when nothing meaningful changed.

**Tip:** Prefer selecting primitives or stable fields (`state.theme`, `state.items`) rather than always returning a new object literal from the selector.

### 6. `useContext` (exported as `useCartContext`, etc.)

Returns `{ state, dispatch }` for the whole feature state.

Handy when a component needs several fields and dispatch together. Prefer `useSelector` when you only need one field and want clearer intent.

### 7. What the factory returns

```ts
return {
  Provider,
  useSelector,
  useDispatch,
  useContext: useContextValue,  // renamed so it doesn't clash with React's useContext import
};
```

---

## The store: `createLoggedStore`

File: [`src/lib/devtools/createLoggedStore.ts`](../src/lib/devtools/createLoggedStore.ts)

This is a small plain JavaScript store (not Redux). It keeps state in a variable and exposes methods.

| Method | Meaning |
| --- | --- |
| `getState()` | Returns current state. |
| `dispatch(action)` | Runs reducer → (in dev) logs + DevTools → updates state → notifies listeners. |
| `subscribe(listener)` | Register a callback for “state changed”. Returns an unsubscribe function. |
| `connectViewer()` | (Dev) Attach console/DevTools. Called from Provider `useEffect`. |
| `disconnectViewer()` | (Dev) Detach DevTools. Called from effect cleanup. |
| `destroy()` | Disconnect viewer and clear listeners (full teardown). |

### What `dispatch` does

```text
prevState = current state
nextState = reducer(prevState, action)

if development:
  log to console
  send to DevTools extension (if connected)

state = nextState
notify all subscribers  → React components re-render
```

### Dev vs production

```ts
const isDev = import.meta.env.DEV;  // provided by Vite — no .env file required
```

| | Local (`npm run dev`) | Production build |
| --- | --- | --- |
| Console logs | Yes | No |
| DevTools connect / send | Yes (if extension installed) | No |
| Reducer + UI updates | Yes | Yes |

Vite sets `import.meta.env.DEV` automatically. The npm script name (`dev`, `dev-ui`, …) does not matter; what matters is that you start the Vite **dev server**.

---

## Console logging: `logContextAction`

File: [`src/lib/devtools/logContextAction.ts`](../src/lib/devtools/logContextAction.ts)

In development, each dispatch opens a collapsed console group titled like:

`Cart` + `ADD_ITEM`

Inside the group:

- **action** — full action (`type` + `payload`)  
- **prev state** — state before the reducer  
- **next state** — state after the reducer  

In production this function returns immediately and does nothing.

---

## Browser DevTools: `connectDevTools`

File: [`src/lib/devtools/connectDevTools.ts`](../src/lib/devtools/connectDevTools.ts)

Talks to the optional **Redux DevTools browser extension** via:

```ts
window.__REDUX_DEVTOOLS_EXTENSION__
```

Important points:

- This is **not** an npm Redux dependency. It is a global the extension injects into the page.  
- If the extension is missing, or we are not in dev, we use a **no-op** connection (safe no-ops for `init` / `send` / etc.).  
- `connect({ name: 'Cart' })` registers an instance named **Cart** in the extension UI. You may need to select that instance in the Redux panel dropdown.  
- Helpers:  
  - `parseDevToolsState` — parses state JSON when you jump in the timeline  
  - `isTimeTravelMessage` — detects jump / reset messages from the extension  

When you jump or reset in DevTools, the store applies that state so the UI stays in sync (dev only).

---

## Strict Mode note (why `connectViewer` lives in `useEffect`)

React Strict Mode in development mounts, cleans up, then mounts again.

If we connected DevTools once when creating the store and then “destroyed” that connection forever on the first cleanup, the console would still log (logging does not need the connection), but the Redux panel would stay empty.

So:

- Store is created in `useState` (once per Provider).  
- DevTools attaches in `useEffect` setup (`connectViewer`).  
- Detaches in cleanup (`disconnectViewer`).  
- Strict Mode’s second setup connects again → DevTools works with Strict Mode on.

---

## End-to-end example (Cart)

1. App wraps UI in `<CartProvider>`.  
2. Store is created with `cartReducer` and empty `items`.  
3. Effect connects the DevTools instance named `Cart`.  
4. User clicks **Add** → `dispatch(addItem(product))`.  
5. Reducer returns new state with that item.  
6. Console shows action + prev/next state.  
7. DevTools shows the same action under **Cart**.  
8. `useCartSelector(s => s.items)` causes the cart UI to update.

Preferences works the same way with its own Provider, store, and DevTools instance name.

---

## Mental checklist for colleagues

| Question | Answer |
| --- | --- |
| Where does state live? | In a small store inside each feature Provider (via Context). |
| How do we update state? | `dispatch(action)` → reducer → new state. |
| How do components read state? | `useXxxSelector` or `useXxxContext`. |
| Why logging? | Debug actions and state transitions in local development. |
| Is Redux installed? | No. Only the optional browser extension for viewing. |
| Does logging run in production? | No. |
| Can we add another feature? | Call `createLoggedContext` again, rename exports, wrap with its Provider. |

---

## Related files

| File | Role |
| --- | --- |
| [`src/lib/createLoggedContext.tsx`](../src/lib/createLoggedContext.tsx) | Factory: Provider + hooks |
| [`src/lib/devtools/createLoggedStore.ts`](../src/lib/devtools/createLoggedStore.ts) | State container + dispatch + viewer lifecycle |
| [`src/lib/devtools/logContextAction.ts`](../src/lib/devtools/logContextAction.ts) | Console groups |
| [`src/lib/devtools/connectDevTools.ts`](../src/lib/devtools/connectDevTools.ts) | Browser extension bridge |
| [`src/features/cart/CartContext.tsx`](../src/features/cart/CartContext.tsx) | Real usage example |
| [`src/features/preferences/PreferencesContext.tsx`](../src/features/preferences/PreferencesContext.tsx) | Second feature example |
| [`README.md`](../README.md) | Project overview (Context, reducer, logging) |
