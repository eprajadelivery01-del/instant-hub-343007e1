import React, { useMemo, useEffect, lazy, Suspense } from "react";
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
import { installRoutePrefetcher, routeLoaders } from "@/lib/routePrefetch";
import "@/lib/routeDataPrefetchers"; // side-effect: registers data prefetchers
import { PrefetchDebugPanel, shouldShowPrefetchPanel } from "@/components/dev/PrefetchDebugPanel";
import { GlobalMarketingListener } from "@/components/shared/GlobalMarketingListener";

import Home from "./pages/marketplace/Home";

const lazyRoute = (path: string) => lazy(routeLoaders[path] as any);

const Login = lazyRoute("/marketplace/login");
const Signup = lazyRoute("/marketplace/signup");
const StoreDetail = lazyRoute("/marketplace/store");
const Cart = lazyRoute("/marketplace/cart");
const Checkout = lazyRoute("/marketplace/checkout");
const Orders = lazyRoute("/marketplace/orders");
const OrderDetail = lazy(() => import("./pages/marketplace/OrderDetail"));
const Addresses = lazyRoute("/marketplace/addresses");
const Profile = lazyRoute("/marketplace/profile");
const Coupons = lazyRoute("/marketplace/coupons");
const PrivacyPolicy = lazyRoute("/marketplace/privacy");
const TermsOfService = lazyRoute("/marketplace/terms");
const Search = lazyRoute("/marketplace/search");
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => {
  useEffect(() => {
    // Hide native splash screen if running inside Capacitor (não-op on web).
    // Use a dynamic, variable specifier so the web build doesn't try to bundle it.
    setTimeout(() => {
      const mod = "@capacitor/splash-screen";
      (new Function("m", "return import(m)") as (m: string) => Promise<any>)(mod)
        .then((m: any) => m?.SplashScreen?.hide?.().catch(() => {}))
        .catch(() => {});
    }, 500);
    installRoutePrefetcher(queryClient);
  }, []);

  const showDebugPanel = useMemo(() => shouldShowPrefetchPanel(), []);

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
                <GlobalMarketingListener />
                {showDebugPanel && <PrefetchDebugPanel />}
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
