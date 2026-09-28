import { describe, expect, it } from "vitest";
import { heatLevel } from "./heat";
import { buildCalendarMonths, formatMonthDay, formatWeekday, generateDates } from "./date";

const compact = (months) =>
  months.map((m) => [m.label, m.weeks.map((w) => w.map((d) => (d ? d.slice(8) : "")).join(","))]);

describe("buildCalendarMonths", () => {
  it("기간이 걸친 주만 일~토 격자로 만든다", () => {
    expect(compact(buildCalendarMonths(generateDates("2026-10-10", "2026-10-23")))).toEqual([
      ["2026년 10월", ["04,05,06,07,08,09,10", "11,12,13,14,15,16,17", "18,19,20,21,22,23,24"]],
    ]);
  });

  it("두 달에 걸친 주는 달마다 나눠서 빈칸으로 채운다", () => {
    expect(compact(buildCalendarMonths(generateDates("2026-09-29", "2026-10-02")))).toEqual([
      ["2026년 9월", ["27,28,29,30,,,"]],
      ["2026년 10월", [",,,,01,02,03"]],
    ]);
  });
});

describe("formatters", () => {
  it("월·일과 요일을 한국어로 표시한다", () => {
    expect(formatMonthDay("2026-10-17")).toBe("10월 17일");
    expect(formatWeekday("2026-10-17")).toBe("토요일");
  });
});

describe("heatLevel", () => {
  it("참가자 대비 비율로 0~5단계를 정한다", () => {
    expect(heatLevel(0, 5)).toBe(0);
    expect(heatLevel(1, 5)).toBe(1);
    expect(heatLevel(4, 5)).toBe(4);
    expect(heatLevel(5, 5)).toBe(5);
    expect(heatLevel(1, 100)).toBe(1);
    expect(heatLevel(3, 0)).toBe(0);
  });
});
