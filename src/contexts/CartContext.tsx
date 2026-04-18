import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, Company } from '@/types/database';

interface CartContextType {
  items: CartItem[];
  company: Company | null;
  notes: Record<string, string>;
  addItem: (product: Product, company: Company) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNote: (productId: string, note: string) => void;
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
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('cart_notes');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('cart_items', JSON.stringify(items));
    localStorage.setItem('cart_notes', JSON.stringify(notes));
    if (company) {
      localStorage.setItem('cart_company', JSON.stringify(company));
    } else {
      localStorage.removeItem('cart_company');
    }
  }, [items, company, notes]);

  const addItem = (product: Product, comp: Company) => {
    if (company && company.id !== comp.id) {
      setItems([{ product, quantity: 1 }]);
      setCompany(comp);
      setNotes({});
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
    setNotes(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(productId);
    setItems(prev =>
      prev.map(i => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const updateNote = (productId: string, note: string) => {
    setNotes(prev => ({ ...prev, [productId]: note }));
  };

  const clearCart = () => {
    setItems([]);
    setCompany(null);
    setNotes({});
    localStorage.removeItem('cart_notes');
  };

  const subtotal = items.reduce(
    (sum, i) => sum + (i.product.price || 0) * i.quantity,
    0
  );

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, company, notes, addItem, removeItem, updateQuantity, updateNote, clearCart, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
