import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { AddressProvider } from "@/contexts/AddressContext";
import { CityProvider } from "@/contexts/CityContext";
import RequireAuth from "@/components/marketplace/RequireAuth";

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
      <CityProvider>
        <CartProvider>
          <AddressProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/marketplace" replace />} />
                  <Route path="/marketplace/login" element={<Login />} />
                  <Route path="/marketplace/signup" element={<Signup />} />
                  <Route path="/marketplace" element={<Home />} />
                  <Route path="/marketplace/store/:id" element={<StoreDetail />} />
                  <Route path="/marketplace/cart" element={<Cart />} />
                  <Route path="/marketplace/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
                  <Route path="/marketplace/orders" element={<RequireAuth><Orders /></RequireAuth>} />
                  <Route path="/marketplace/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
                  <Route path="/marketplace/addresses" element={<RequireAuth><Addresses /></RequireAuth>} />
                  <Route path="/marketplace/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AddressProvider>
        </CartProvider>
      </CityProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
