import { heatLevel } from "../utils/heat";
import { buildCalendarMonths, formatMonthDay, formatWeekday, parseDateParts, WEEKDAYS } from "../utils/date";


export default function VoteCalendar({
  dates,
  total,
  selected,
  focusDate,
  countFor,
  onToggle,
}) {
  const months = buildCalendarMonths(dates);
  const inRange = new Set(dates);
  const showMonthTitle = months.length > 1;

  return (
    <div>
      {months.map((month) => (
        <div key={month.key} className="cal-month">
          {showMonthTitle && <div className="cal-month__title">{month.label}</div>}

          <div className="cal-grid" role="group" aria-label={month.label}>
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`cal-wd ${i === 0 ? "cal-wd--sun" : ""} ${i === 6 ? "cal-wd--sat" : ""}`}
              >
                {w}
              </div>
            ))}

            {month.weeks.flat().map((dateStr, i) => {
              if (!dateStr) {
                return <div key={`blank-${i}`} className="cal-cell cal-cell--blank" />;
              }

              const { day } = parseDateParts(dateStr);

              if (!inRange.has(dateStr)) {
                return (
                  <div key={dateStr} className="cal-cell cal-cell--out" aria-hidden="true">
                    {day}
                    <span className="cal-cell__count" />
                  </div>
                );
              }

              const count = countFor(dateStr);
              const mine = selected.includes(dateStr);
              const level = heatLevel(count, total);
              const className = [
                "cal-cell",
                level ? `cal-cell--heat-${level}` : "",
                mine ? "cal-cell--mine" : "",
                dateStr === focusDate ? "cal-cell--focus" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={className}
                  aria-pressed={mine}
                  aria-label={`${formatMonthDay(dateStr)} ${formatWeekday(dateStr)}, ${count}명 가능${mine ? ", 선택됨" : ""}`}
                  onClick={() => onToggle(dateStr)}
                >
                  {day}
                  <span className="cal-cell__count">{count ? `${count}명` : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="legend">
        적음
        {[1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            className="legend__swatch"
            style={{ background: `var(--heat-${level})` }}
          />
        ))}
        많음
        <span className="legend__mine" />
        내가 고른 날
      </div>
    </div>
  );
}
