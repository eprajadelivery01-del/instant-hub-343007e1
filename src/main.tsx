import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGlobalErrorHandlers, reportErrorToTelegram } from "@/services/logger";
import { toast as sonnerToast } from "sonner";

initializeGlobalErrorHandlers("Marketplace Cliente");

// Patch sonner toast.error globally to automatically capture all user-facing errors.
// Mensagens específicas devem ser definidas pelos componentes (ex.: Checkout/mapServerError);
// aqui só normalizamos legados em inglês e reportamos para telemetria.
const originalError = sonnerToast.error;
const lastReportedToast = new Map<string, number>();

sonnerToast.error = function (message: any, options: any) {
  const rawText = typeof message === "string" ? message : JSON.stringify(message);
  const lower = rawText?.toLowerCase() ?? "";

  let text = rawText;
  if (lower.includes("failed to load products")) {
    text = "Não conseguimos carregar os produtos agora. Tente novamente em instantes.";
  } else if (lower.includes("failed to fetch") || lower.includes("network error")) {
    text = "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  if (lower.includes("offline")) {
    return originalError.apply(this, arguments as any);
  }

  // Evita spam no monitoramento quando o usuário toca repetidamente em
  // "Tentar novamente" para o mesmo problema; a Edge Function já registra
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
        options: options ? JSON.stringify(options) : ""
      }
    }, "Marketplace Cliente").catch(() => {});
  }
  
  return originalError.call(this, text, options as any);
};

createRoot(document.getElementById("root")!).render(<App />);
