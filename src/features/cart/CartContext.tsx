import { createLoggedContext } from '../../lib/createLoggedContext';
import { cartReducer } from './cartReducer';
import { initialCartState } from './cartTypes';

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

export {
  CartProvider,
  useCartSelector,
  useCartDispatch,
  useCartContext,
};
