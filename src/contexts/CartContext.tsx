import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, Company } from '@/types/database';

interface CartContextType {
  items: CartItem[];
  company: Company | null;
  notes: Record<string, string>;
  addItem: (product: Product, company: Company, options?: any[], quantity?: number, note?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateNote: (cartItemId: string, note: string) => void;
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

  const addItem = (product: Product, comp: Company, options: any[] = [], quantity: number = 1, note: string = '') => {
    // Generate a unique ID for this item + options combo + note
    const optionsHash = options.map(o => o.id).sort().join('-');
    const noteHash = note ? btoa(note).slice(0, 10) : '';
    const cartItemId = `${product.id}${optionsHash ? `-${optionsHash}` : ''}${noteHash ? `-${noteHash}` : ''}`;

    if (company && company.id !== comp.id) {
      if (!confirm('Você já possui itens de outra loja na sacola. Deseja limpar a sacola e iniciar um novo pedido?')) return;
      setItems([{ id: cartItemId, product, quantity, options, note }]);
      setCompany(comp);
      setNotes({});
      return;
    }
    setCompany(comp);
    setItems(prev => {
      const existing = prev.find(i => i.id === cartItemId);
      if (existing) {
        return prev.map(i =>
          i.id === cartItemId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { id: cartItemId, product, quantity, options, note }];
    });
  };

  const removeItem = (cartItemId: string) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== cartItemId);
      if (filtered.length === 0) setCompany(null);
      return filtered;
    });
    setNotes(prev => {
      const next = { ...prev };
      delete next[cartItemId];
      return next;
    });
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(cartItemId);
    setItems(prev =>
      prev.map(i => (i.id === cartItemId ? { ...i, quantity } : i))
    );
  };

  const updateNote = (cartItemId: string, note: string) => {
    setNotes(prev => ({ ...prev, [cartItemId]: note }));
  };

  const clearCart = () => {
    setItems([]);
    setCompany(null);
    setNotes({});
    localStorage.removeItem('cart_notes');
  };

  const calculateItemPrice = (item: CartItem) => {
    let price = Number(item.product.price || 0);
    if (item.options) {
      item.options.forEach(opt => {
        price += Number(opt.price || 0);
      });
    }
    return price;
  };

  const subtotal = items.reduce(
    (sum, i) => sum + calculateItemPrice(i) * i.quantity,
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
