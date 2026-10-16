import type { CartAction, CartState } from './cartTypes';

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((item) => item.id === action.payload.id);

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        };
      }

      return {
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }

    case 'REMOVE_ITEM': {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (!existing) return state;

      if (existing.quantity === 1) {
        return {
          items: state.items.filter((item) => item.id !== action.payload.id),
        };
      }

      return {
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        ),
      };
    }

    case 'CLEAR':
      return { items: [] };

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
