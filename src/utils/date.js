const DAY_MS = 24 * 60 * 60 * 1000;

// reason: "YYYY-MM-DD"를 UTC 기준으로만 다뤄서 시간대·서머타임에 따라
// 날짜가 밀리거나 중복되지 않게 함
function toUtcMs(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toDateStr(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isValidDateStr(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return false;
  return toDateStr(toUtcMs(dateStr)) === dateStr;
}

// 시작일·종료일을 포함한 날짜 수
export function countDays(start, end) {
  return Math.round((toUtcMs(end) - toUtcMs(start)) / DAY_MS) + 1;
}

export function addDays(dateStr, days) {
  return toDateStr(toUtcMs(dateStr) + days * DAY_MS);
}

export const generateDates = (start, end) => {
  const result = [];
  const last = toUtcMs(end);

  for (let ms = toUtcMs(start); ms <= last; ms += DAY_MS) {
    result.push(toDateStr(ms));
  }

  return result;
};

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "2026-10-17" → { year, month, day, weekday(0=일) }
export function parseDateParts(dateStr) {
  const date = new Date(toUtcMs(dateStr));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

// "2026-10-17" → "10월 17일"
export function formatMonthDay(dateStr) {
  const { month, day } = parseDateParts(dateStr);
  return `${month}월 ${day}일`;
}

// "2026-10-17" → "토요일"
export function formatWeekday(dateStr) {
  return `${WEEKDAYS[parseDateParts(dateStr).weekday]}요일`;
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

/**
 * 투표 기간을 달력 형태로 나눔.
 * 반환: [{ key: "2026-10", label: "2026년 10월", weeks: [[날짜문자열|null x7], ...] }]
 * 기간이 걸친 주만 보여주고, 다른 달의 날짜 칸은 null(빈칸)로 채움.
 */
export function buildCalendarMonths(dates) {
  if (!dates?.length) return [];

  const inRange = new Set(dates);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const gridStart = addDays(first, -parseDateParts(first).weekday);
  const gridEnd = addDays(last, 6 - parseDateParts(last).weekday);
  const allDays = generateDates(gridStart, gridEnd);
  const months = new Map();

  for (let i = 0; i < allDays.length; i += 7) {
    const week = allDays.slice(i, i + 7);

    // reason: 한 주가 두 달에 걸치면 달마다 따로 한 줄씩 만들어 달 경계를 분명히 함
    [...new Set(week.map(monthKey))].forEach((key) => {
      const row = week.map((d) => (monthKey(d) === key ? d : null));
      if (!row.some((d) => d && inRange.has(d))) return;

      if (!months.has(key)) {
        const { year, month } = parseDateParts(`${key}-01`);
        months.set(key, { key, label: `${year}년 ${month}월`, weeks: [] });
      }
      months.get(key).weeks.push(row);
    });
  }

  return [...months.values()];
}
