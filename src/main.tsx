import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGlobalErrorHandlers, reportErrorToTelegram } from "@/services/logger";
import { toast as sonnerToast } from "sonner";

initializeGlobalErrorHandlers("Marketplace Cliente");

// Patch sonner toast.error globally to automatically capture all user-facing errors
const originalError = sonnerToast.error;
sonnerToast.error = function (message: any, options: any) {
  const rawText = typeof message === "string" ? message : JSON.stringify(message);
  const text = rawText?.toLowerCase().includes("failed to load products")
    ? "Não foi possível validar os itens do carrinho. Atualize a sacola e tente novamente."
    : rawText;
  
  if (text.includes("offline")) {
    return originalError.apply(this, arguments as any);
  }

  reportErrorToTelegram({
    error_message: `Alerta para o Usuário: ${text}`,
    stack_trace: `Sonner toast.error exibido na tela do cliente.`,
    url: window.location.href,
    additional_info: {
      isUserFacingAlert: true,
      options: options ? JSON.stringify(options) : ""
    }
  }, "Marketplace Cliente").catch(() => {});
  
  return originalError.call(this, text, options as any);
};

createRoot(document.getElementById("root")!).render(<App />);
