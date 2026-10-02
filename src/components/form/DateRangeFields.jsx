import { MAX_DATE_RANGE_DAYS } from "../../constants/app";
import { addDays } from "../../utils/date";

function openDatePicker(event) {
  const input = event.currentTarget;
  if (typeof input.showPicker !== "function") return;

  try {
    input.showPicker();
  } catch {
    // reason: 일부 브라우저는 포커스 타이밍에 showPicker를 거부함 — 네이티브 클릭에 맡김
  }
}

function blockDateKeyboard(event) {
  if (event.key === "Tab" || event.key === "Escape") return;
  event.preventDefault();
}

// 시작일·종료일 입력 + 최대 기간 안내
export default function DateRangeFields({ start, end, onStartChange, onEndChange, disabled, idPrefix = "range" }) {
  // reason: 달력에서 고를 수 있는 범위를 최대 기간 안으로 제한
  const startMin = end ? addDays(end, -(MAX_DATE_RANGE_DAYS - 1)) : undefined;
  const endMax = start ? addDays(start, MAX_DATE_RANGE_DAYS - 1) : undefined;

  const common = {
    className: "input date-input",
    type: "date",
    onClick: openDatePicker,
    onKeyDown: blockDateKeyboard,
    onPaste: (e) => e.preventDefault(),
    disabled,
  };

  return (
    <div className="field">
      <div className="date-row">
        <div className="field">
          <label className="field__label" htmlFor={`${idPrefix}-start`}>
            시작일
          </label>
          <input
            {...common}
            id={`${idPrefix}-start`}
            value={start}
            min={startMin}
            max={end || undefined}
            onChange={(e) => onStartChange(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${idPrefix}-end`}>
            종료일
          </label>
          <input
            {...common}
            id={`${idPrefix}-end`}
            value={end}
            min={start || undefined}
            max={endMax}
            onChange={(e) => onEndChange(e.target.value)}
          />
        </div>
      </div>
      <p className="field__hint">날짜는 최대 {MAX_DATE_RANGE_DAYS}일까지 선택할 수 있어요</p>
    </div>
  );
}
