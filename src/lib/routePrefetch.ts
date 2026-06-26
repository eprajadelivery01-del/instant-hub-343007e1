// Centralized dynamic imports for route-level code splitting.
// Used by App.tsx (via React.lazy) and by the prefetcher to warm chunks
// on hover/focus/touch before the user actually navigates.

export const routeLoaders: Record<string, () => Promise<unknown>> = {
  "/marketplace/login": () => import("@/pages/marketplace/Login"),
  "/marketplace/signup": () => import("@/pages/marketplace/Signup"),
  "/marketplace/search": () => import("@/pages/marketplace/Search"),
  "/marketplace/store": () => import("@/pages/marketplace/StoreDetail"),
  "/marketplace/cart": () => import("@/pages/marketplace/Cart"),
  "/marketplace/checkout": () => import("@/pages/marketplace/Checkout"),
  "/marketplace/orders": () => import("@/pages/marketplace/Orders"),
  "/marketplace/addresses": () => import("@/pages/marketplace/Addresses"),
  "/marketplace/profile": () => import("@/pages/marketplace/Profile"),
  "/marketplace/coupons": () => import("@/pages/marketplace/Coupons"),
  "/marketplace/privacy": () => import("@/pages/marketplace/PrivacyPolicy"),
  "/marketplace/terms": () => import("@/pages/marketplace/TermsOfService"),
};

const prefetched = new Set<string>();

function matchLoader(path: string): (() => Promise<unknown>) | null {
  if (routeLoaders[path]) return routeLoaders[path];
  // Dynamic segments: /marketplace/store/:id, /marketplace/orders/:id
  if (/^\/marketplace\/store\/[^/]+/.test(path)) return routeLoaders["/marketplace/store"];
  if (/^\/marketplace\/orders\/[^/]+/.test(path)) return routeLoaders["/marketplace/orders"];
  return null;
}

export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  const loader = matchLoader(path);
  if (!loader) return;
  prefetched.add(path);
  // Use idle callback when available to avoid contending with critical work.
  const run = () => loader().catch(() => prefetched.delete(path));
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void) => number);
  if (ric) ric(run);
  else setTimeout(run, 1);
}

function extractInternalPath(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

let installed = false;

export function installRoutePrefetcher(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const handler = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    const path = extractInternalPath(anchor.getAttribute("href"));
    if (path) prefetchRoute(path);
  };

  // Hover (desktop), focus (keyboard), touchstart (mobile early signal),
  // and pointerdown as the final hint right before navigation.
  window.addEventListener("mouseover", handler, { passive: true, capture: true });
  window.addEventListener("focusin", handler, { capture: true });
  window.addEventListener("touchstart", handler, { passive: true, capture: true });
  window.addEventListener("pointerdown", handler, { passive: true, capture: true });
}