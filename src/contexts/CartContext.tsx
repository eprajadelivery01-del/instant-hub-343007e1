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
  
  // Coupon state
  appliedCoupon: any | null;
  applicableProductIds: string[];
  setCouponData: (coupon: any, productIds: string[]) => void;
  removeCoupon: () => void;
  discountAmount: number;
  total: number;
  deliveryFee: number;
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

  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(() => {
    const saved = localStorage.getItem('cart_coupon');
    return saved ? JSON.parse(saved) : null;
  });
  const [applicableProductIds, setApplicableProductIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('cart_coupon_pids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart_items', JSON.stringify(items));
    if (company) {
      localStorage.setItem('cart_company', JSON.stringify(company));
    } else {
      localStorage.removeItem('cart_company');
    }
    
    if (appliedCoupon) {
      localStorage.setItem('cart_coupon', JSON.stringify(appliedCoupon));
      localStorage.setItem('cart_coupon_pids', JSON.stringify(applicableProductIds));
    } else {
      localStorage.removeItem('cart_coupon');
      localStorage.removeItem('cart_coupon_pids');
    }
  }, [items, company, appliedCoupon, applicableProductIds]);

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
    setAppliedCoupon(null);
    setApplicableProductIds([]);
  };

  const setCouponData = (coupon: any, pids: string[]) => {
    setAppliedCoupon(coupon);
    setApplicableProductIds(pids);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setApplicableProductIds([]);
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

  const discountAmount = (() => {
    if (!appliedCoupon) return 0;
    
    const isSpecific = applicableProductIds.length > 0;
    const eligibleItems = isSpecific 
      ? items.filter(item => applicableProductIds.includes(item.product.id))
      : items;
    
    const eligibleSubtotal = eligibleItems.reduce(
      (acc, item) => acc + (calculateItemPrice(item) * item.quantity),
      0
    );
    
    if (eligibleSubtotal === 0) return 0;

    if (appliedCoupon.discount_type === 'percentage') {
      const discount = (eligibleSubtotal * (appliedCoupon.discount_value / 100));
      return Math.min(discount, appliedCoupon.max_discount_value || Infinity);
    }
    
    return Math.min(eligibleSubtotal, appliedCoupon.discount_value);
  })();

  const deliveryFee = 0; // Not calculated here anymore
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <CartContext.Provider value={{ 
      items, company, addItem, removeItem, updateQuantity, updateNote, clearCart, 
      subtotal, itemCount, appliedCoupon, applicableProductIds, setCouponData, removeCoupon, discountAmount, total, deliveryFee 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
