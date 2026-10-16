# Migrating Context → Redux Toolkit (no install yet)

This app already uses an RTK-shaped API. Migrating is mostly **wiring**, not rewriting UI.

| Today (Context) | After (RTK) |
| --- | --- |
| `useCartSelector((s) => s.items)` | `useAppSelector((s) => s.cart.items)` |
| `useCartDispatch()` / `usePreferencesDispatch()` | `useAppDispatch()` |
| `dispatch(addItem(product))` | **same** |
| Nested `<CartProvider><PreferencesProvider>` | One `<Provider store={store}>` |
| DevTools via `createLoggedStore` | Built into RTK (`configureStore`) |

---

## Step 1 — Turn each feature into a slice

Your reducer + action creators become one `createSlice`. Logic stays the same.

### Cart — today

```ts
// cartActions.ts
export const addItem = (payload) => ({ type: 'ADD_ITEM', payload });

// cartReducer.ts
case 'ADD_ITEM': // ...same logic you have now
```

### Cart — RTK equivalent

```ts
// features/cart/cartSlice.ts  (replaces cartActions + cartReducer + CartContext)
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, CartState } from './cartTypes';

const initialState: CartState = { items: [] };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Omit<CartItem, 'quantity'>>) {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) {
        existing.quantity += 1; // Immer — safe "mutation"
        return;
      }
      state.items.push({ ...action.payload, quantity: 1 });
    },
    removeItem(state, action: PayloadAction<string>) {
      const existing = state.items.find((i) => i.id === action.payload);
      if (!existing) return;
      if (existing.quantity === 1) {
        state.items = state.items.filter((i) => i.id !== action.payload);
        return;
      }
      existing.quantity -= 1;
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addItem, removeItem, clearCart } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
```

Preferences maps the same way (`setTheme`, `setCurrency`).

**Action names used in components stay the same** (`addItem`, `clearCart`, …).

---

## Step 2 — One store instead of many providers

```ts
// app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { cartReducer } from '../features/cart/cartSlice';
import { preferencesReducer } from '../features/preferences/preferencesSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    preferences: preferencesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```ts
// app/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

DevTools: enabled automatically in development by `configureStore`. You can delete `createLoggedStore` / `createLoggedContext` when you cut over.

---

## Step 3 — Component diffs (the easy part)

### PreferencesDemo — today

```tsx
const theme = usePreferencesSelector((state) => state.theme);
const currency = usePreferencesSelector((state) => state.currency);
const dispatch = usePreferencesDispatch();

dispatch(setTheme('dark'));
```

### PreferencesDemo — after RTK

```tsx
const theme = useAppSelector((state) => state.preferences.theme);
const currency = useAppSelector((state) => state.preferences.currency);
const dispatch = useAppDispatch();

dispatch(setTheme('dark')); // unchanged
```

Only the **hook import** and **selector path** change (`state.theme` → `state.preferences.theme`).

### CartDemo — today

```tsx
const items = useCartSelector((state) => state.items);
const { dispatch } = useCartContext();
dispatch(addItem(product));
```

### CartDemo — after RTK

```tsx
const items = useAppSelector((state) => state.cart.items);
const dispatch = useAppDispatch();
dispatch(addItem(product)); // unchanged
```

---

## Step 4 — App shell

### Today

```tsx
<CartProvider>
  <PreferencesProvider>
    <main>...</main>
  </PreferencesProvider>
</CartProvider>
```

### After RTK

```tsx
import { Provider } from 'react-redux';
import { store } from './app/store';

<Provider store={store}>
  <main>...</main>
</Provider>
```

Delete `CartContext.tsx` / `PreferencesContext.tsx` once every consumer uses `useAppSelector` / `useAppDispatch`.

---

## What you delete vs keep

| Keep | Replace / delete |
| --- | --- |
| `cartTypes.ts`, `preferencesTypes.ts` | `CartContext.tsx`, `PreferencesContext.tsx` |
| Feature UI components | Nested feature Providers in `App.tsx` |
| Action *names* (`addItem`, …) | Manual `cartActions.ts` + `cartReducer.ts` → one `cartSlice.ts` |
| — | `src/lib/createLoggedContext.tsx`, `createLoggedStore.ts`, DevTools helpers |

---

## Migration checklist (when you install RTK later)

1. `npm i @reduxjs/toolkit react-redux`
2. Add `cartSlice.ts` / `preferencesSlice.ts` (copy reducer logic)
3. Add `store.ts` + typed `useAppSelector` / `useAppDispatch`
4. Swap hooks in components (selector paths gain a feature key)
5. Wrap app in `<Provider store={store}>`, remove Context providers
6. Remove Context + logging helpers

**UI and `dispatch(actionCreator())` calls barely change** — that is why the current Context API was shaped this way.
