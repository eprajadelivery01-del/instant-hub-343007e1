import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { AddressProvider } from "@/contexts/AddressContext";
import { CityProvider } from "@/contexts/CityContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import RequireAuth from "@/components/marketplace/RequireAuth";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { PageTransition } from "@/components/shared/PageTransition";

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
import PrivacyPolicy from "./pages/marketplace/PrivacyPolicy";
import TermsOfService from "./pages/marketplace/TermsOfService";
import Search from "./pages/marketplace/Search";
import NotFound from "./pages/NotFound";

const App = () => {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }), []);

  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CityProvider>
          <CartProvider>
            <AddressProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <ScrollToTop />
                  <Routes>
                    <Route path="/" element={<Navigate to="/marketplace" replace />} />
                    <Route path="/marketplace/login" element={<PageTransition><Login /></PageTransition>} />
                    <Route path="/marketplace/signup" element={<PageTransition><Signup /></PageTransition>} />
                    <Route path="/marketplace" element={<PageTransition><Home /></PageTransition>} />
                    <Route path="/marketplace/search" element={<PageTransition><Search /></PageTransition>} />
                    <Route path="/marketplace/store/:id" element={<PageTransition><StoreDetail /></PageTransition>} />
                    <Route path="/marketplace/cart" element={<PageTransition><Cart /></PageTransition>} />
                    <Route path="/marketplace/checkout" element={<PageTransition><RequireAuth><Checkout /></RequireAuth></PageTransition>} />
                    <Route path="/marketplace/orders" element={<PageTransition><RequireAuth><Orders /></RequireAuth></PageTransition>} />
                    <Route path="/marketplace/orders/:id" element={<PageTransition><RequireAuth><OrderDetail /></RequireAuth></PageTransition>} />
                    <Route path="/marketplace/addresses" element={<PageTransition><RequireAuth><Addresses /></RequireAuth></PageTransition>} />
                    <Route path="/marketplace/profile" element={<PageTransition><RequireAuth><Profile /></RequireAuth></PageTransition>} />
                    <Route path="/marketplace/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
                    <Route path="/marketplace/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
                    <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </AddressProvider>
          </CartProvider>
        </CityProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
