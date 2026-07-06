// Centralized dynamic imports for route-level code splitting.
// Used by App.tsx (via React.lazy) and by the prefetcher to warm chunks
// (and optionally data) on hover/focus/touch before the userá actually
// navigates. Includes throttle, concurrency limit, hover-out cancel and
// metrics reporting.

import type { QueryClient } from "@tanstack/react-query";

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

// ---------- Route → loader resolution ----------

type DataPrefetcher = (
  params: Record<string, string>,
  queryClient: QueryClient,
  signal: AbortSignal,
) => Promise<unknown>;

interface RoutePattern {
  test: RegExp;
  loaderKey: string;
  extractParams: (path: string) => Record<string, string>;
}

const dynamicPatterns: RoutePattern[] = [
  {
    test: /^\/marketplace\/store\/([^/]+)/,
    loaderKey: "/marketplace/store",
    extractParams: (p) => ({ id: p.match(/^\/marketplace\/store\/([^/]+)/)![1] }),
  },
  {
    test: /^\/marketplace\/orders\/([^/]+)/,
    loaderKey: "/marketplace/orders",
    extractParams: (p) => ({ id: p.match(/^\/marketplace\/orders\/([^/]+)/)![1] }),
  },
];

function resolveRoute(path: string): {
  loader: () => Promise<unknown>;
  loaderKey: string;
  params: Record<string, string>;
} | null {
  if (routeLoaders[path]) {
    return { loader: routeLoaders[path], loaderKey: path, params: {} };
  }
  for (const p of dynamicPatterns) {
    if (p.test.test(path)) {
      const loader = routeLoaders[p.loaderKey];
      if (!loader) return null;
      return { loader, loaderKey: p.loaderKey, params: p.extractParams(path) };
    }
  }
  return null;
}

// ---------- Data prefetch registry (TanStack Query) ----------

const dataPrefetchers = new Map<string, DataPrefetcher>();

/**
 * Register a data prefetcher for a given loader key (e.g. "/marketplace/store").
 * The prefetcher receives the URL params, the shared QueryClient and an
 * AbortSignal so it can drop in-flight work when the userá moves away.
 */
export function registerRouteDataPrefetcher(loaderKey: string, fn: DataPrefetcher): void {
  dataPrefetchers.set(loaderKey, fn);
}

// ---------- Concurrency limiter + throttle ----------

const MAX_CONCURRENT = 2;
const HOVER_DWELL_MS = 80; // userá must linger this long before we prefetch
const COMMIT_DWELL_MS = 0; // pointerdown/touchstart fires immediately

let inFlight = 0;
const queue: Array<() => void> = [];

function schedule(run: () => Promise<void>) {
  const launch = () => {
    inFlight++;
    run().finally(() => {
      inFlight--;
      const next = queue.shift();
      if (next) next();
    });
  };
  if (inFlight < MAX_CONCURRENT) launch();
  else queue.push(launch);
}

// ---------- Per-path prefetch state (chunk + data) ----------

interface PrefetchState {
  chunkDone: boolean;
  dataDone: boolean;
  abort: AbortController;
  startedAt: number;
  chunkMs?: number;
  dataMs?: number;
}

const states = new Map<string, PrefetchState>();

// ---------- Metrics ----------

interface MetricEvent {
  path: string;
  type: "chunk" | "data" | "navigate" | "cancel";
  ms?: number;
  ts: number;
}

const metrics: MetricEvent[] = [];
const pendingHover = new Map<string, number>(); // path → first hover timestamp

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => {
    try { l(); } catch { /* nãoop */ }
  });
}

export function subscribePrefetchEvents(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function recordMetric(ev: MetricEvent) {
  metrics.push(ev);
  if (metrics.length > 500) metrics.shift();
  emit();
}

function getQueryClient(): QueryClient | null {
  return (window as any).__queryClient ?? null;
}

export function startPrefetch(path: string, opts: { dataToo: boolean } = { dataToo: true }) {
  const existing = states.get(path);
  if (existing && existing.chunkDone && (!opts.dataToo || existing.dataDone)) return;
  if (existing && !existing.abort.signal.aborted) return; // already running

  const resolved = resolveRoute(path);
  if (!resolved) return;

  const state: PrefetchState = {
    chunkDone: existing?.chunkDone ?? false,
    dataDone: existing?.dataDone ?? false,
    abort: new AbortController(),
    startedAt: performance.now(),
  };
  states.set(path, state);

  schedule(async () => {
    if (state.abort.signal.aborted) return;
    if (!state.chunkDone) {
      const t0 = performance.now();
      try {
        await resolved.loader();
        state.chunkDone = true;
        state.chunkMs = performance.now() - t0;
        recordMetric({ path, type: "chunk", ms: state.chunkMs, ts: Date.now() });
      } catch {
        states.delete(path); // allow retry later
        return;
      }
    }

    if (!opts.dataToo || state.dataDone || state.abort.signal.aborted) return;
    const dataFn = dataPrefetchers.get(resolved.loaderKey);
    const qc = getQueryClient();
    if (!dataFn || !qc) return;

    const t1 = performance.now();
    try {
      await dataFn(resolved.params, qc, state.abort.signal);
      if (state.abort.signal.aborted) return;
      state.dataDone = true;
      state.dataMs = performance.now() - t1;
      recordMetric({ path, type: "data", ms: state.dataMs, ts: Date.now() });
    } catch {
      /* swallow — prefetch is best-effort */
    }
  });
}

export function cancelPrefetch(path: string) {
  const state = states.get(path);
  if (!state || (state.chunkDone && state.dataDone)) return;
  // Only cancel if not yet committed — chunks already imported stay cached.
  state.abort.abort();
  recordMetric({ path, type: "cancel", ts: Date.now() });
}

// ---------- Report / debug API ----------

export interface PrefetchReport {
  byPath: Record<
    string,
    { chunk: number | null; data: number | null; navigateMs: number | null; cancels: number }
  >;
  events: MetricEvent[];
  lcp: number[];
  inFlight: number;
  queued: number;
  generatedAt: string;
}

export function getPrefetchReport(): PrefetchReport {
  const byPath: PrefetchReport["byPath"] = {};
  metrics.forEach((m) => {
    const slot =
      (byPath[m.path] ||= { chunk: null, data: null, navigateMs: null, cancels: 0 });
    if (m.type === "chunk") slot.chunk = m.ms ?? null;
    if (m.type === "data") slot.data = m.ms ?? null;
    if (m.type === "navigate") slot.navigateMs = m.ms ?? null;
    if (m.type === "cancel") slot.cancels += 1;
  });
  const lcp = (performance.getEntriesByType("largest-contentful-paint") as PerformanceEntry[])
    .map((e) => Math.round(e.startTime));
  return {
    byPath,
    events: metrics.slice(),
    lcp,
    inFlight,
    queued: queue.length,
    generatedAt: new Date().toISOString(),
  };
}

export function downloadPrefetchReport(): void {
  if (typeof window === "undefined") return;
  const report = getPrefetchReport();
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prefetch-report-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Test-only helpers ----------

export function __resetPrefetchForTests(): void {
  inFlight = 0;
  queue.length = 0;
  states.clear();
  metrics.length = 0;
  pendingHover.clear();
  installed = false;
}

export function __getPrefetchInternals() {
  return {
    get inFlight() { return inFlight; },
    get queueLength() { return queue.length; },
    states,
    metrics,
  };
}

// ---------- DOM wiring ----------

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

function getLinkPath(target: EventTarget | null): string | null {
  const el = target as HTMLElement | null;
  if (!el) return null;
  const anchor = el.closest("a[href]") as HTMLAnchorElement | null;
  if (!anchor) return null;
  return extractInternalPath(anchor.getAttribute("href"));
}

let installed = false;

export function installRoutePrefetcher(queryClient?: QueryClient): void {
  if (typeof window === "undefined") return;
  if (queryClient) (window as any).__queryClient = queryClient;
  if (installed) return;
  installed = true;

  // Hover/focus — throttled with a dwell timer so quick mouse fly-overs
  // don't fire prefetches; also cancellable.
  const hoverTimers = new Map<string, number>();

  const onEnter = (event: Event) => {
    const path = getLinkPath(event.target);
    if (!path) return;
    if (hoverTimers.has(path) || states.get(path)?.chunkDone) return;
    pendingHover.set(path, performance.now());
    const t = window.setTimeout(() => {
      hoverTimers.delete(path);
      startPrefetch(path, { dataToo: true });
    }, HOVER_DWELL_MS);
    hoverTimers.set(path, t);
  };

  const onLeave = (event: Event) => {
    const path = getLinkPath(event.target);
    if (!path) return;
    const t = hoverTimers.get(path);
    if (t !== undefined) {
      clearTimeout(t);
      hoverTimers.delete(path);
      pendingHover.delete(path);
    } else {
      // Hover timer already fired and prefetch may be in flight — cancel it.
      cancelPrefetch(path);
    }
  };

  // Commit signal: pointer/touch down → userá is about to click. Fire now.
  const onCommit = (event: Event) => {
    const path = getLinkPath(event.target);
    if (!path) return;
    const t = hoverTimers.get(path);
    if (t !== undefined) {
      clearTimeout(t);
      hoverTimers.delete(path);
    }
    void COMMIT_DWELL_MS;
    startPrefetch(path, { dataToo: true });
  };

  window.addEventListener("mouseover", onEnter, { passive: true, capture: true });
  window.addEventListener("focusin", onEnter, { capture: true });
  window.addEventListener("mouseout", onLeave, { passive: true, capture: true });
  window.addEventListener("focusout", onLeave, { capture: true });
  window.addEventListener("pointerdown", onCommit, { passive: true, capture: true });
  window.addEventListener("touchstart", onCommit, { passive: true, capture: true });

  // Navigation timing: when the URL changes, record how long after the
  // first hover the navigation actually happened (prefetch "hit" quality).
  const onNavigate = () => {
    const path = window.location.pathname;
    const hoverTs = pendingHover.get(path);
    const ms = hoverTs ? performance.now() - hoverTs : undefined;
    recordMetric({ path, type: "navigate", ms, ts: Date.now() });
    pendingHover.clear();
  };
  window.addEventListener("popstate", onNavigate);
  const origPush = history.pushState;
  history.pushState = function (...args) {
    const r = origPush.apply(this, args as any);
    queueMicrotask(onNavigate);
    return r;
  };

  // Public debug API.
  (window as any).__prefetchReport = () => {
    const r = getPrefetchReport();
    // eslint-disable-next-line não-console
    console.table(r.byPath);
    return r;
  };
  (window as any).__prefetchReportDownload = downloadPrefetchReport;
}