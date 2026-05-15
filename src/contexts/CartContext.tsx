import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, Company } from '@/types/database';

interface CartContextType {
  items: CartItem[];
  company: Company | null;
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

  useEffect(() => {
    localStorage.setItem('cart_items', JSON.stringify(items));
    if (company) {
      localStorage.setItem('cart_company', JSON.stringify(company));
    } else {
      localStorage.removeItem('cart_company');
    }
  }, [items, company]);

  const addItem = (product: Product, comp: Company, options: any[] = [], quantity: number = 1, note: string = '') => {
    // Generate a unique ID for this item based on product + options
    // Note is now editable and doesn't define the item's identity in the cart
    const optionsHash = options.map(o => o.id).sort().join('-');
    const cartItemId = `${product.id}${optionsHash ? `-${optionsHash}` : ''}`;

    if (company && company.id !== comp.id) {
      if (!confirm('Você já possui itens de outra loja na sacola. Deseja limpar a sacola e iniciar um novo pedido?')) return;
      setItems([{ id: cartItemId, product, quantity, options, note }]);
      setCompany(comp);
      return;
    }
    setCompany(comp);
    setItems(prev => {
      const existing = prev.find(i => i.id === cartItemId);
      if (existing) {
        return prev.map(i =>
          i.id === cartItemId ? { ...i, quantity: i.quantity + quantity, note: note || i.note } : i
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
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(cartItemId);
    setItems(prev =>
      prev.map(i => (i.id === cartItemId ? { ...i, quantity } : i))
    );
  };

  const updateNote = (cartItemId: string, note: string) => {
    setItems(prev =>
      prev.map(i => (i.id === cartItemId ? { ...i, note } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setCompany(null);
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
    <CartContext.Provider value={{ items, company, addItem, removeItem, updateQuantity, updateNote, clearCart, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
