/**
 * Em produção o console deve ficar totalmente limpo: nenhum log, aviso ou
 * erro técnico deve ser exposto ao usuário final (evita vazamento de dados
 * internos e ruído no DevTools do app).
 *
 * A telemetria (Telegram/audit) continua funcionando porque o logger envolve
 * o console e envia os eventos antes de chamar o método original silenciado.
 */
const noop = () => {};

export function silenceConsoleInProduction() {
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return;

  const methods: Array<keyof Console> = [
    "log",
    "info",
    "warn",
    "debug",
    "trace",
    "table",
    "group",
    "groupCollapsed",
    "groupEnd",
    "dir",
    "count",
    "time",
    "timeEnd",
    "error",
  ];

  for (const method of methods) {
    try {
      (console as any)[method] = noop;
    } catch {
      /* ignore */
    }
  }
}