import { addItem, clearCart, removeItem } from './cartActions';
import { useCartContext, useCartSelector } from './CartContext';

const catalog = [
  { id: 'apple', name: 'Apple', price: 1.25 },
  { id: 'banana', name: 'Banana', price: 0.75 },
  { id: 'coffee', name: 'Coffee', price: 4.5 },
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export const CartDemo = () => {
  // Fine-grained read
  const items = useCartSelector((state) => state.items);
  // Or both: const { state, dispatch } = useCartContext();
  const { dispatch } = useCartContext();

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <section className="cart">
      <header className="cart__header">
        <h1>Cart Context</h1>
        <p>
          Uses <code>useCartSelector</code> / <code>useCartContext</code> (or{' '}
          <code>useCartDispatch</code>). Check Console and Redux DevTools (
          <strong>Cart</strong>).
        </p>
      </header>

      <div className="cart__grid">
        <div className="cart__panel">
          <h2>Catalog</h2>
          <ul className="cart__list">
            {catalog.map((product) => (
              <li key={product.id} className="cart__row">
                <div>
                  <strong>{product.name}</strong>
                  <span>{formatCurrency(product.price)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(addItem(product))}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="cart__panel">
          <div className="cart__panel-header">
            <h2>Cart</h2>
            <button
              type="button"
              className="cart__ghost"
              disabled={items.length === 0}
              onClick={() => dispatch(clearCart())}
            >
              Clear
            </button>
          </div>

          {items.length === 0 ? (
            <p className="cart__empty">Cart is empty</p>
          ) : (
            <ul className="cart__list">
              {items.map((item) => (
                <li key={item.id} className="cart__row">
                  <div>
                    <strong>
                      {item.name} × {item.quantity}
                    </strong>
                    <span>
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch(removeItem(item.id))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="cart__total">
            Total: <strong>{formatCurrency(total)}</strong>
          </p>
        </div>
      </div>
    </section>
  );
};
