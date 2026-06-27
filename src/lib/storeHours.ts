import { z } from "zod";

/**
 * Shared utility to determine whether a store is currently open based on its
 * weekly schedule. Validates inputs (days + HH:mm times) with zod and degrades
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

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleEntrySchema = z.object({
  day: z.enum(["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]),
  active: z.boolean().optional().default(true),
  start: z.string().regex(timeRegex, "Horário inválido (HH:mm)").optional(),
  end: z.string().regex(timeRegex, "Horário inválido (HH:mm)").optional(),
});

export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;

const scheduleSchema = z.array(scheduleEntrySchema);

export type BusinessHoursInput =
  | string
  | ScheduleEntry[]
  | null
  | undefined;

function toMinutes(value: string | undefined, fallback: number): number {
  if (!value || !timeRegex.test(value)) return fallback;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Parses and validates a business-hours payload. Accepts either a JSON string
 * or an already-parsed array. Returns `null` when the payload is absent or
 * cannot be safely interpreted.
 */
export function parseBusinessHours(
  input: BusinessHoursInput
): ScheduleEntry[] | null {
  if (input == null) return null;
  try {
    const raw =
      typeof input === "string"
        ? input.trim().startsWith("[")
          ? JSON.parse(input)
          : null
        : input;
    if (!raw) return null;
    const result = scheduleSchema.safeParse(raw);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Returns true when the current time falls inside the configured schedule for
 * today. When the schedule is missing/invalid, returns `true` so the caller's
 * manual `is_open` flag remains the source of truth.
 */
export function isStoreOpenBySchedule(
  input: BusinessHoursInput,
  now: Date = new Date()
): boolean {
  const schedule = parseBusinessHours(input);
  if (!schedule) return true;

  const today = WEEK_DAYS[now.getDay()];
  const entry = schedule.find((d) => d.day === today);
  if (!entry || entry.active === false) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = toMinutes(entry.start, 0);
  const endMinutes = toMinutes(entry.end, 23 * 60 + 59);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Shared helpers so every screen renders the same status/prep-time copy.
 */
export type StoreStatusInput = {
  is_open?: boolean | null;
  active?: boolean | null;
  business_hours?: BusinessHoursInput;
};

export function isStoreOpenNow(company: StoreStatusInput): boolean {
  return (
    company.active !== false &&
    company.is_open === true &&
    isStoreOpenBySchedule(company.business_hours)
  );
}

export function getStoreStatusLabel(company: StoreStatusInput): string {
  return isStoreOpenNow(company) ? "Aberta agora" : "Fechada";
}

export function getPrepTimeLabel(company: {
  prep_time_min?: number | null;
  prep_time_max?: number | null;
}): string {
  const min = company.prep_time_min ?? 25;
  const max = company.prep_time_max ?? 45;
  return `${min}-${max} min`;
}