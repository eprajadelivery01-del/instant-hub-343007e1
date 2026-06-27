import { describe, it, expect } from "vitest";
import { isStoreOpenBySchedule, isStoreOpenNow } from "@/lib/storeHours";

// Sunday 2025-01-05 18:00 UTC = 15:00 in São Paulo (UTC-3), 13:00 in LA (UTC-8)
const sundayEvening = new Date("2025-01-05T18:00:00Z");
const schedule = [
  { day: "Dom", active: true, start: "14:00", end: "16:00" },
];

describe("isStoreOpenBySchedule timezone-safe", () => {
  it("treats schedule as São Paulo time when tz is explicit", () => {
    expect(isStoreOpenBySchedule(schedule as any, sundayEvening, "America/Sao_Paulo")).toBe(true);
  });

  it("evaluates the same instant differently in Los Angeles", () => {
    expect(isStoreOpenBySchedule(schedule as any, sundayEvening, "America/Los_Angeles")).toBe(false);
  });

  it("Home and StoreDetail agree when given the same inputs", () => {
    const company = { is_open: true, active: true, business_hours: schedule as any, timezone: "America/Sao_Paulo" };
    const homeResult = isStoreOpenNow(company);
    const detailResult = company.active && company.is_open && isStoreOpenBySchedule(company.business_hours, new Date(), company.timezone);
    expect(homeResult).toBe(Boolean(detailResult));
  });
});