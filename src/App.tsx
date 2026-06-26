import React, { useMemo, useEffect, lazy, Suspense } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
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

import Home from "./pages/marketplace/Home";

const Login = lazy(() => import("./pages/marketplace/Login"));
const Signup = lazy(() => import("./pages/marketplace/Signup"));
const StoreDetail = lazy(() => import("./pages/marketplace/StoreDetail"));
const Cart = lazy(() => import("./pages/marketplace/Cart"));
const Checkout = lazy(() => import("./pages/marketplace/Checkout"));
const Orders = lazy(() => import("./pages/marketplace/Orders"));
const OrderDetail = lazy(() => import("./pages/marketplace/OrderDetail"));
const Addresses = lazy(() => import("./pages/marketplace/Addresses"));
const Profile = lazy(() => import("./pages/marketplace/Profile"));
const Coupons = lazy(() => import("./pages/marketplace/Coupons"));
const PrivacyPolicy = lazy(() => import("./pages/marketplace/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/marketplace/TermsOfService"));
const Search = lazy(() => import("./pages/marketplace/Search"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => {
  useEffect(() => {
    // Hide splash screen after React mounts
    setTimeout(() => {
       SplashScreen.hide().catch(() => {});
    }, 500);
  }, []);

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
                  <Suspense fallback={<RouteFallback />}>
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
                    <Route path="/marketplace/coupons" element={<PageTransition><RequireAuth><Coupons /></RequireAuth></PageTransition>} />
                    <Route path="/marketplace/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
                    <Route path="/marketplace/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
                    <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
                  </Routes>
                  </Suspense>
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
