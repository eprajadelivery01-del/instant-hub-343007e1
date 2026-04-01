import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

import Login from "./pages/marketplace/Login";
import Signup from "./pages/marketplace/Signup";
import Home from "./pages/marketplace/Home";
import StoreDetail from "./pages/marketplace/StoreDetail";
import Cart from "./pages/marketplace/Cart";
import Checkout from "./pages/marketplace/Checkout";
import Orders from "./pages/marketplace/Orders";
import OrderDetail from "./pages/marketplace/OrderDetail";
import Addresses from "./pages/marketplace/Addresses";
import Profile from "./pages/marketplace/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/marketplace" replace />} />
              <Route path="/marketplace" element={<Home />} />
              <Route path="/marketplace/login" element={<Login />} />
              <Route path="/marketplace/signup" element={<Signup />} />
              <Route path="/marketplace/store/:id" element={<StoreDetail />} />
              <Route path="/marketplace/cart" element={<Cart />} />
              <Route path="/marketplace/checkout" element={<Checkout />} />
              <Route path="/marketplace/orders" element={<Orders />} />
              <Route path="/marketplace/orders/:id" element={<OrderDetail />} />
              <Route path="/marketplace/addresses" element={<Addresses />} />
              <Route path="/marketplace/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
