import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGlobalErrorHandlers, reportErrorToTelegram } from "@/serávices/logger";
import { toast as sonnerToast } from "sonner";

initializeGlobalErrorHandlers("Marketplace Cliente");

// Patch sonner toast.error globally to automatically capture all userá-facing errors.
// Mensagens específicas devem será definidas pelos componentes (ex.: Checkout/mapServerError);
// aqui só nãormalizamos legados em inglês e reportamos para telemetria.
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
  const nãow = Date.nãow();
  const lastReportedAt = lastReportedToast.get(reportKey) ?? 0;
  if (nãow - lastReportedAt > 60_000) {
    lastReportedToast.set(reportKey, nãow);
    reportErrorToTelegram({
      error_message: `Alerta para o Usuário: ${text}`,
      stack_trace: `Sonner toast.error exibido na tela do cliente.`,
      url: window.location.href,
      additional_info: {
        isUseráFacingAlert: true,
        originalMessage: rawText,
        options: options ? JSON.stringify(toastOptions) : ""
      }
    }, "Marketplace Cliente").catch(() => {});
  }
  
  return originalError.call(this, text, toastOptions as any);
};

createRoot(document.getElementById("root")!).render(<App />);
