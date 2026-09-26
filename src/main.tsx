import "@/lib/silenceConsole";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/lib/firebase";
import { initializeGlobalErrorHandlers, reportErrorToTelegram } from "@/services/logger";
import { toast as sonnerToast } from "sonner";

initializeGlobalErrorHandlers("Marketplace Cliente");

// Polyfill for Node.prototype.closest to prevent "t.closest is not a function"
// when events bubble from TextNodes (especially on iOS Safari with certain libraries like Radix/Vaul)
if (typeof document !== "undefined" && typeof Node !== "undefined") {
  if (!(Node.prototype as any).closest) {
    (Node.prototype as any).closest = function (this: Node, s: string) {
      if (this instanceof Element) {
        return Element.prototype.closest.call(this, s);
      }
      let el = this.parentElement || this.parentNode;
      while (el !== null && el.nodeType === 1) {
        if ((el as Element).matches(s)) return el as Element;
        el = el.parentElement || el.parentNode;
      }
      return null;
    };
  }
}

// Patch sonner toast.error globally to automatically capture all user-facing errors.
// Mensagens específicas devem será definidas pelos componentes (ex.: Checkout/mapServerError);
// aqui só normalizamos legados em inglês e reportamos para telemetria.
const originalError = sonnerToast.error;
const lastReportedToast = new Map<string, number>();

sonnerToast.error = function (message: any, options: any) {
  const rawText = typeof message === "string" ? message : JSON.stringify(message);
  const lower = rawText?.toLowerCase() ?? "";
  const { diagnosticLogged, ...toastOptions } = options ?? {};

  let text = rawText;
  if (lower.includes("failed to load products")) {
    text = "Não foi possível validar sua sacola. Atualize a sacola ou tente novamente.";
  } else if (lower.includes("failed to fetch") || lower.includes("network error")) {
    text = "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  const lowerNorm = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ignorePatterns = [
    "offline",
    "cupom",
    "expirou",
    "invalido",
    "invalida",
    "exclusivo de outra loja",
    "valor minimo para aplicar",
    "ja esta em uso",
    "ja cadastrado",
    "ja existe",
    "user already registered",
    "email ou senha",
    "senha incorreta",
    "credenciais invalidas",
    "invalid login",
    "invalid_credentials",
    "telefone valido",
    "preencha todos os campos",
    "senhas nao coincidem",
    "minimo de 6 caracteres",
    "campo obrigatorio",
    "sessao expirada",
    "codigo incorreto",
    "digite um endereco"
  ];

  if (ignorePatterns.some(pattern => lowerNorm.includes(pattern))) {
    return originalError.call(this, text, toastOptions as any);
  }

  // Erros do checkout com request_id já ficam registrados nos audit_logs da
  // Edge Function; não reenviar o mesmo alerta ao Telegram evita spam sem
  // perder o diagnóstico técnico.
  if (options?.id === "checkout-create-order-error" && toastOptions?.diagnosticLogged) {
    return originalError.call(this, text, toastOptions as any);
  }

  // Evita spam não monitoramento quando o usuário toca repetidamente em
  // "Tentar nãovamente" para o mesmo problema; a Edge Function já registra
  // o diagnóstico detalhado em audit_logs com request_id.
  const reportKey = `${window.location.pathname}|${text}`;
  const now = Date.now();
  const lastReportedAt = lastReportedToast.get(reportKey) ?? 0;
  if (now - lastReportedAt > 60_000) {
    lastReportedToast.set(reportKey, now);
    reportErrorToTelegram({
      error_message: `Alerta para o Usuário: ${text}`,
      stack_trace: `Sonner toast.error exibido na tela do cliente.`,
      url: window.location.href,
      additional_info: {
        isUserFacingAlert: true,
        originalMessage: rawText,
        options: options ? JSON.stringify(toastOptions) : ""
      }
    }, "Marketplace Cliente").catch(() => {});
  }
  
  return originalError.call(this, text, toastOptions as any);
};

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event: any) => {
    event.preventDefault();
    console.warn("[Vite] Módulo dinâmico desatualizado detectado após nova versão, recarregando aplicação...");
    const sessionKey = "vite_preload_error_reload_ts";
    const last = sessionStorage.getItem(sessionKey);
    const now = Date.now();
    if (!last || now - Number(last) > 10000) {
      sessionStorage.setItem(sessionKey, String(now));
      window.location.reload();
    }
  });
}

class GlobalErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    const isChunkError =
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed") ||
      error?.name === "ChunkLoadError";

    if (isChunkError && typeof window !== "undefined") {
      const sessionKey = "error_boundary_chunk_reload_ts";
      const last = sessionStorage.getItem(sessionKey);
      const now = Date.now();
      if (!last || now - Number(last) > 10000) {
        sessionStorage.setItem(sessionKey, String(now));
        if ("caches" in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          }).catch(() => {});
        }
        window.location.reload();
      }
    }
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes("Failed to fetch dynamically imported module") ||
        this.state.error?.message?.includes("Importing a module script failed") ||
        this.state.error?.name === "ChunkLoadError";

      return (
        <div style={{ padding: '20px', background: 'white', color: '#1f2937', height: '100vh', width: '100vw', overflow: 'auto', zIndex: 999999, position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ maxWidth: '420px', width: '100%', padding: '24px', borderRadius: '16px', background: '#f9fafb', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#dc2626' }}>
              {isChunkError ? "Nova Versão Disponível" : "Ocorreu um Erro no App"}
            </h2>
            <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '16px' }}>
              {isChunkError 
                ? "O aplicativo foi atualizado com melhorias. Clique no botão abaixo para carregar a versão mais recente." 
                : (this.state.error?.message || "Algo inesperado ocorreu ao carregar a página.")}
            </p>

            <button 
              onClick={() => {
                if ("caches" in window) {
                  caches.keys().then((names) => {
                    names.forEach((name) => caches.delete(name));
                  }).catch(() => {});
                }
                localStorage.removeItem("@epraja_cache_timestamp_v1");
                sessionStorage.clear();
                window.location.href = window.location.pathname + "?t=" + Date.now();
              }}
              style={{ width: '100%', padding: '14px 20px', background: '#e11d48', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              🔄 Atualizar e Continuar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);
