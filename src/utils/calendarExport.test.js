import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl } from "./calendarExport";
import { addMonths } from "./date";

describe("캘린더에 추가", () => {
  const info = { title: "10월, 모임; 저녁", date: "2026-10-17", url: "https://x.app/join/abc", uid: "abc" };

  it("구글 캘린더 링크는 하루 종일 일정으로 만든다", () => {
    const url = new URL(googleCalendarUrl(info));
    expect(url.searchParams.get("dates")).toBe("20261017/20261018");
    expect(url.searchParams.get("text")).toBe("10월, 모임; 저녁");
  });

  it(".ics 파일에 날짜·제목·링크가 들어간다", () => {
    const ics = buildIcs({ ...info, now: new Date("2026-10-01T00:00:00Z") });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261017");
    expect(ics).toContain("DTEND;VALUE=DATE:20261018");
    expect(ics).toContain("SUMMARY:10월\\, 모임\\; 저녁");
    expect(ics).toContain("URL:https://x.app/join/abc");
  });
});

describe("addMonths", () => {
  it("없는 날짜는 그 달 마지막 날로 맞춘다", () => {
    expect(addMonths("2026-10-17", 3)).toBe("2027-01-17");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonths("2027-11-30", 3)).toBe("2028-02-29");
  });
});
