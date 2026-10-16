import type { CartItem } from './cartTypes';

export const addItem = (payload: Omit<CartItem, 'quantity'>) =>
  ({ type: 'ADD_ITEM' as const, payload });

export const removeItem = (id: string) =>
  ({ type: 'REMOVE_ITEM' as const, payload: { id } });

export const clearCart = () => ({ type: 'CLEAR' as const });
