import { CartProvider } from './features/cart/CartContext';
import { CartDemo } from './features/cart/CartDemo';
import { PreferencesProvider } from './features/preferences/PreferencesContext';
import { PreferencesDemo } from './features/preferences/PreferencesDemo';
import './App.css';

export default function App() {
  return (
    <CartProvider>
      <PreferencesProvider>
        <main className="app">
          <CartDemo />
          <PreferencesDemo />
        </main>
      </PreferencesProvider>
    </CartProvider>
  );
}
