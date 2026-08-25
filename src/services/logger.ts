import { supabase } from "@/lib/supabase";

export interface ErrorPayload {
  error_message: string;
  stack_trace?: string;
  url?: string;
  additional_info?: Record<string, any>;
}

let isReporting = false;

export async function reportErrorToTelegram(payload: ErrorPayload, appName = "Marketplace Cliente") {
  if (isReporting) return;
  
  // Ignore errors from Lovable preview environments to avoid false alarms
  const currentUrl = payload.url || window.location.href;
  if (currentUrl.includes("lovableproject.com")) {
    return;
  }

  // Ignore specific harmless user-facing errors
  const msg = (payload.error_message || "").toLowerCase();
  const additionalStr = JSON.stringify(payload.additional_info || {}).toLowerCase();
  const combined = `${msg} ${additionalStr}`;

  const ignoreKeywords = [
    "aps-environment",
    "código de autorização",
    "codigo de autorizacao",
    "nenhum código de autorização",
    "nenhum codigo de autorizacao",
    "authorization",
    "apns",
    "erro no registro de push",
    "falha ao registrar push",
    "deliveryoverlay is not defined",
    "permissão de sobreposição",
    "permissao de sobreposicao",
    "corrida já foi aceita",
    "corrida ja foi aceita",
    "esta corrida ja foi aceita",
    "esta corrida já foi aceita",
    "ops! já foi aceita",
    "ops! ja foi aceita",
    "esta corrida ja pertence a outro entregador",
    "esta corrida já pertence a outro entregador",
    "erro na entrega",
    "senha",
    "inválida",
    "invalida",
    "credenciais",
    "offline",
    "não encontrada",
    "nao encontrada",
    "failed to fetch",
    "networkerror",
    "network error",
    "network request failed",
    "load failed",
    "the operation was aborted",
    "aborterror",
    "abort error",
    "refreshaccesstoken",
    "callrefreshtoken",
    "exclusivo para entregadores"
  ];

  if (ignoreKeywords.some(keyword => combined.includes(keyword))) {
    return;
  }
  
  isReporting = true;

  try {
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    
    const requestBody = {
      app_name: appName,
      error_message: payload.error_message,
      stack_trace: payload.stack_trace || new Error().stack || "",
      user_id: user?.id || "Não autenticado",
      user_email: user?.email || "Anônimo",
      url: payload.url || window.location.pathname,
      additional_info: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        time: new Date().toISOString(),
        ...payload.additional_info
      }
    };

    // Invoke the Supabase Edge Function
    await supabase.functions.invoke("telegram-logger", {
      body: requestBody
    });
  } catch (err) {
    // Avoid recursion, just print using a standard, unpatched backup if possible
    console.warn("Failed to report error to Telegram:", err);
  } finally {
    isReporting = false;
  }
}

export function initializeGlobalErrorHandlers(appName: string) {
  if (typeof window === "undefined") return;

  // Intercept standard window exception errors
  window.onerror = (message, source, linenão, colnão, error) => {
    const errorMsg = String(message);
    if (errorMsg === 'Script error.') return false;

    reportErrorToTelegram({
      error_message: errorMsg,
      stack_trace: error?.stack || `At ${source}:${linenão}:${colnão}`,
      url: window.location.href,
      additional_info: {
        source,
        linenão,
        colnão
      }
    }, appName);
    return false;
  };

  // Intercept unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    const reasonMsg = reason?.message || String(reason);
    
    reportErrorToTelegram({
      error_message: `Unhandled Rejection: ${reason?.message || reason}`,
      stack_trace: reason?.stack || "No stack trace available",
      url: window.location.href,
      additional_info: {
        reason: typeof reason === "object" ? JSON.stringify(reason) : String(reason)
      }
    }, appName);
  };

  // Intercept programmatic console.error calls (including accessibility / radix-ui warnings)
  const originalConsoleError = console.error;
  console.error = function (...args) {
    // Invoke original console logger ALWAYS
    originalConsoleError.apply(console, args);

    // Format error message cleanly
    const msg = args.map(a => {
      if (a instanceof Error) return a.message + "\n" + a.stack;
      try {
        return typeof a === "object" ? JSON.stringify(a) : String(a);
      } catch (e) {
        return "[Circular or unstringifiable object]";
      }
    }).join(" ");

    // Skip nested reporting to prevent loops
    if (isReporting) return;

    reportErrorToTelegram({
      error_message: `[Console Error] ${msg.slice(0, 1000)}`,
      stack_trace: new Error().stack || "Logged via console.error",
      url: window.location.href,
      additional_info: {
        isConsoleError: true
      }
    }, appName).catch(() => {});
  };
}
