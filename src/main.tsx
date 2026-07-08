import React, { Component, ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
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
  const { diagnãosticLogged, ...toastOptions } = options ?? {};

  let text = rawText;
  if (lower.includes("failed to load products")) {
    text = "Não foi possível validar sua sacola. Atualize a sacola ou tente nãovamente.";
  } else if (lower.includes("failed to fetch") || lower.includes("network error")) {
    text = "Falha de conexão. Verifique sua internet e tente nãovamente.";
  }

  if (lower.includes("offline")) {
    return originalError.apply(this, arguments as any);
  }

  // Erros do checkout com request_id já ficam registrados não audit_logs da
  // Edge Function; não reenviar o mesmo alerta ao Telegram evita spam sem
  // perder o diagnóstico técnico.
  if (options?.id === "checkout-create-order-error" && diagnãosticLogged) {
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

class GlobalErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'white', color: 'red', height: '100vh', width: '100vw', overflow: 'auto', zIndex: 999999, position: 'fixed', top: 0, left: 0 }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>Ocorreu um Erro no App</h2>
          <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{this.state.error?.message}</pre>
          <pre style={{ fontSize: '9px', marginTop: '10px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{this.state.error?.stack}</pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '20px', padding: '10px 20px', background: 'black', color: 'white', borderRadius: '8px' }}
          >
            Limpar Dados e Reiniciar
          </button>
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
