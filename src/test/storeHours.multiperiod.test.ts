import { describe, it, expect } from "vitest";
import { isStoreOpenBySchedule, getNextOpenTimeInfo, parseBusinessHours, formatPeriodsLabel } from "@/lib/storeHours";

describe("storeHours - Multi-period and automated open/close", () => {
  const multiPeriodSchedule = [
    {
      day: "Seg",
      active: true,
      start: "07:00",
      end: "23:00",
      periods: [
        { start: "07:00", end: "14:00" },
        { start: "17:00", end: "23:00" }
      ]
    },
    {
      day: "Ter",
      active: false,
      start: "00:00",
      end: "00:00",
      periods: [{ start: "00:00", end: "00:00" }]
    },
    {
      day: "Qua",
      active: true,
      start: "18:00",
      end: "02:00",
      periods: [{ start: "18:00", end: "02:00" }]
    }
  ];

  // Monday: 2025-01-06
  // America/Cuiaba is UTC-4:
  // 10:00 Cuiaba = 14:00 UTC
  // 15:30 Cuiaba = 19:30 UTC
  // 19:00 Cuiaba = 23:00 UTC
  // 23:30 Cuiaba = 2025-01-07 03:30 UTC

  it("is open during first shift (07:00-14:00)", () => {
    const mondayMorning = new Date("2025-01-06T14:00:00Z"); // 10:00 Cuiaba
    expect(isStoreOpenBySchedule(multiPeriodSchedule, mondayMorning, "America/Cuiaba")).toBe(true);
  });

  it("is closed during interval (14:01-16:59)", () => {
    const mondayAfternoon = new Date("2025-01-06T19:30:00Z"); // 15:30 Cuiaba
    expect(isStoreOpenBySchedule(multiPeriodSchedule, mondayAfternoon, "America/Cuiaba")).toBe(false);
  });

  it("is open during second shift (17:00-23:00)", () => {
    const mondayNight = new Date("2025-01-06T23:00:00Z"); // 19:00 Cuiaba
    expect(isStoreOpenBySchedule(multiPeriodSchedule, mondayNight, "America/Cuiaba")).toBe(true);
  });

  it("is closed after second shift (23:01)", () => {
    const mondayLate = new Date("2025-01-07T03:30:00Z"); // 23:30 Cuiaba
    expect(isStoreOpenBySchedule(multiPeriodSchedule, mondayLate, "America/Cuiaba")).toBe(false);
  });

  it("handles midnight-crossing shift correctly", () => {
    // Wednesday 18:00 to Thursday 02:00
    // Thursday 01:00 Cuiaba = 2025-01-09T05:00:00Z
    const thursdayDawn = new Date("2025-01-09T05:00:00Z");
    expect(isStoreOpenBySchedule(multiPeriodSchedule, thursdayDawn, "America/Cuiaba")).toBe(true);
  });

  it("returns next opening time when closed during interval", () => {
    const mondayAfternoon = new Date("2025-01-06T19:30:00Z"); // 15:30 Cuiaba
    const nextInfo = getNextOpenTimeInfo(multiPeriodSchedule, mondayAfternoon, "America/Cuiaba");
    expect(nextInfo).toBe("Abre hoje às 17:00");
  });

  it("formats multi-period labels cleanly", () => {
    const parsed = parseBusinessHours(multiPeriodSchedule);
    expect(parsed).not.toBeNull();
    const seg = parsed!.find(d => d.day === "Seg");
    expect(formatPeriodsLabel(seg?.periods)).toBe("07:00 às 14:00 | 17:00 às 23:00");
  });
});
