import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export from the dedicated module so existing imports keep working.
export {
  isStoreOpenBySchedule,
  parseBusinessHours,
  WEEK_DAYS,
  type ScheduleEntry,
  type WeekDay,
  type BusinessHoursInput,
} from "./storeHours";
