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
