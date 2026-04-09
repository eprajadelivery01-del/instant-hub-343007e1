import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, Company } from '@/types/database';

interface CartContextType {
  items: CartItem[];
  company: Company | null;
  addItem: (product: Product, company: Company) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart_items');
    return saved ? JSON.parse(saved) : [];
  });
  const [company, setCompany] = useState<Company | null>(() => {
    const saved = localStorage.getItem('cart_company');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('cart_items', JSON.stringify(items));
    if (company) {
      localStorage.setItem('cart_company', JSON.stringify(company));
    } else {
      localStorage.removeItem('cart_company');
    }
  }, [items, company]);

  const addItem = (product: Product, comp: Company) => {
    if (company && company.id !== comp.id) {
      // Different store - clear cart
      setItems([{ product, quantity: 1 }]);
      setCompany(comp);
      return;
    }
    setCompany(comp);
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.product.id !== productId);
      if (filtered.length === 0) setCompany(null);
      return filtered;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(productId);
    setItems(prev =>
      prev.map(i => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setCompany(null);
  };

  const subtotal = items.reduce(
    (sum, i) => sum + (i.product.price || 0) * i.quantity,
    0
  );

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, company, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
