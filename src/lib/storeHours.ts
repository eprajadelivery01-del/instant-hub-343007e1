import { z } from "zod";

/**
 * Shared utility to determine whether a store is currently open based on its
 * weekly schedule. Validates inputs (days + HH:mm times) and degrades
 * gracefully when the schedule is missing/malformed so callers can fall back
 * to the manual `is_open` flag.
 */

export type WeekDay = "Dom" | "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sab";

export const WEEK_DAYS: readonly WeekDay[] = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sab",
] as const;

export type ScheduleEntry = {
  day: WeekDay;
  active: boolean;
  start: string;
  end: string;
};

export type BusinessHoursInput =
  | string
  | any[]
  | Record<string, any>
  | null
  | undefined;

function normalizeDayName(d: any): WeekDay | null {
  if (d == null) return null;
  const str = String(d).trim().toLowerCase();
  if (str.startsWith("dom") || str === "sun" || str === "sunday" || str === "0") return "Dom";
  if (str.startsWith("seg") || str === "mon" || str === "monday" || str === "1") return "Seg";
  if (str.startsWith("ter") || str === "tue" || str === "tuesday" || str === "2") return "Ter";
  if (str.startsWith("qua") || str === "wed" || str === "wednesday" || str === "3") return "Qua";
  if (str.startsWith("qui") || str === "thu" || str === "thursday" || str === "4") return "Qui";
  if (str.startsWith("sex") || str === "fri" || str === "friday" || str === "5") return "Sex";
  if (str.startsWith("sab") || str.startsWith("sáb") || str === "sat" || str === "saturday" || str === "6") return "Sab";
  return null;
}

function toMinutes(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const str = String(value).trim();
  const match = str.match(/^([01]?\d|2[0-3]):([0-5]\d)/);
  if (!match) return fallback;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h * 60 + m;
}

/**
 * Returns the IANA timezone the schedule should be evaluated in.
 * Order: explicit override → America/Cuiaba default.
 */
export function resolveTimezone(explicit?: string | null): string {
  if (explicit && typeof explicit === "string" && explicit.trim()) return explicit;
  return "America/Cuiaba";
}

/**
 * Extracts weekday/hour/minute in the given timezone using Intl.
 */
function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "America/Cuiaba",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, WeekDay> = {
    Sun: "Dom",
    Mon: "Seg",
    Tue: "Ter",
    Wed: "Qua",
    Thu: "Qui",
    Fri: "Sex",
    Sat: "Sab",
  };
  let hour = Number(get("hour")) || 0;
  if (hour === 24) hour = 0; // Fix para WebViews do Android que retornam 24 para 00:00
  const minute = Number(get("minute")) || 0;
  return {
    day: weekdayMap[get("weekday")] ?? "Dom",
    minutes: hour * 60 + minute,
  };
}

/**
 * Parses and validates a business-hours payload.
 * Accepts arrays, wrappers ({ days: [...] }), or dictionaries ({ Dom: {...} }).
 */
export function parseBusinessHours(
  input: BusinessHoursInput
): ScheduleEntry[] | null {
  if (!input) return null;
  let raw: any = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return null;
    }
  }

  if (!raw) return null;

  // Se vier empacotado em objeto { days: [...] } ou { workingDays: [...] } ou { hours: [...] }
  if (!Array.isArray(raw) && typeof raw === "object") {
    if (Array.isArray(raw.days)) raw = raw.days;
    else if (Array.isArray(raw.workingDays)) raw = raw.workingDays;
    else if (Array.isArray(raw.hours)) raw = raw.hours;
    else {
      // Dicionário { Dom: { active: true, start: "08:00", end: "18:00" } }
      const entries: ScheduleEntry[] = [];
      Object.keys(raw).forEach((key) => {
        const normDay = normalizeDayName(key);
        if (normDay) {
          const item = raw[key];
          entries.push({
            day: normDay,
            active: item?.active !== false && item?.isOpen !== false && item?.is_open !== false,
            start: item?.start || item?.open || item?.opening || "00:00",
            end: item?.end || item?.close || item?.closing || "23:59",
          });
        }
      });
      if (entries.length > 0) return entries;
      return null;
    }
  }

  if (!Array.isArray(raw)) return null;

  const result: ScheduleEntry[] = [];
  for (const item of raw) {
    if (typeof item === "object" && item !== null) {
      const normDay = normalizeDayName(item.day || item.weekday || item.name);
      if (normDay) {
        result.push({
          day: normDay,
          active: item.active !== false && item.isOpen !== false && item.is_open !== false,
          start: item.start || item.open || item.opening_time || item.from || "00:00",
          end: item.end || item.close || item.closing_time || item.to || "23:59",
        });
      }
    }
  }

  return result.length > 0 ? result : null;
}

/**
 * Returns true when the current time falls inside the configured schedule for today.
 */
export function isStoreOpenBySchedule(
  input: BusinessHoursInput,
  now: Date = new Date(),
  timeZone?: string | null
): boolean {
  const schedule = parseBusinessHours(input);
  if (!schedule || schedule.length === 0) return true; // Sem horário cadastrado → confia no campo manual is_open do banco

  const tz = resolveTimezone(timeZone);
  let day: WeekDay;
  let currentMinutes: number;

  try {
    const zoned = getZonedParts(now, tz);
    day = zoned.day;
    currentMinutes = zoned.minutes;
  } catch (e) {
    const dayIndex = now.getDay();
    day = WEEK_DAYS[dayIndex];
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  const entry = schedule.find((d) => d.day === day);
  if (!entry || entry.active === false) return false;

  const startMinutes = toMinutes(entry.start, 0);
  let endMinutes = toMinutes(entry.end, 23 * 60 + 59);

  if (endMinutes <= startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Shared helpers so every screen renders the same status/prep-time copy.
 */
export type StoreStatusInput = {
  is_open?: boolean | null;
  active?: boolean | null;
  is_active?: boolean | null;
  business_hours?: BusinessHoursInput;
  timezone?: string | null;
};

export function isStoreOpenNow(company: StoreStatusInput): boolean {
  if (!company) return false;
  
  // Se a empresa estiver desativada, fica fechada
  const isActive = company.active !== false && company.is_active !== false;
  if (!isActive) return false;

  // Se o lojista desativou a loja manualmente, ela fica fechada
  if (company.is_open === false) return false;

  // O horário cadastrado pelo lojista é a fonte da verdade.
  // `is_open === true` significa apenas "não pausada manualmente";
  // se houver horário cadastrado, ele decide se está aberta agora.
  // (isStoreOpenBySchedule retorna true quando não há horário válido cadastrado)
  return isStoreOpenBySchedule(company.business_hours, new Date(), company.timezone);
}

export function getStoreStatusLabel(company: StoreStatusInput): string {
  return isStoreOpenNow(company) ? "Aberta agora" : "Fechada";
}

export function getPrepTimeLabel(company: {
  prep_time?: number | null;
  prep_time_min?: number | null;
  prep_time_max?: number | null;
}): string {
  if (company.prep_time_min != null && company.prep_time_max != null) {
    return `${company.prep_time_min}-${company.prep_time_max} min`;
  }
  if (company.prep_time != null && Number(company.prep_time) > 0) {
    const val = Math.round(Number(company.prep_time));
    const min = Math.max(5, val - 5);
    const max = val + 10;
    return `${min}-${max} min`;
  }
  const min = company.prep_time_min ?? 25;
  const max = company.prep_time_max ?? 45;
  return `${min}-${max} min`;
}

export function sortStoresByOpenStatus<T extends StoreStatusInput>(companies: T[] | null | undefined): T[] {
  if (!companies || companies.length === 0) return companies ?? [];
  return [...companies].sort((a, b) => {
    const aOpen = isStoreOpenNow(a) === true;
    const bOpen = isStoreOpenNow(b) === true;
    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;
    const aRating = Number((a as any).rating) || 0;
    const bRating = Number((b as any).rating) || 0;
    return bRating - aRating;
  });
}