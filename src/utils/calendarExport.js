import { addDays } from "./date";

// 확정된 약속을 캘린더 앱에 추가 (하루 종일 일정)

const compact = (dateStr) => dateStr.replaceAll("-", "");

export function googleCalendarUrl({ title, date, url }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${compact(date)}/${compact(addDays(date, 1))}`,
    details: url,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcs(text = "") {
  return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// 아이폰 캘린더·아웃룩 등에서 여는 .ics 파일 내용
export function buildIcs({ title, date, url, uid, now = new Date() }) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//meeting-app//KO",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@meeting-app`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(date)}`,
    `DTEND;VALUE=DATE:${compact(addDays(date, 1))}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(url)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcs({ title, date, url, uid }) {
  const blob = new Blob([buildIcs({ title, date, url, uid })], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${title || "약속"}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
