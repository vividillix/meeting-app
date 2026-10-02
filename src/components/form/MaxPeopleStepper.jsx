import { useState } from "react";
import { MAX_PEOPLE } from "../../constants/app";

/**
 * 최대 인원 −/+ 입력. 숫자를 직접 칠 수도 있음.
 * reason: 입력 중엔 빈칸도 허용하고(draft), 칸을 벗어나면 실제 값으로 되돌려 보여줌
 */
export default function MaxPeopleStepper({ value, onChange, min = 1, max = MAX_PEOPLE, disabled, hint }) {
  const [draft, setDraft] = useState(null);
  const clamp = (n) => Math.min(max, Math.max(min, n));

  const handleInput = (event) => {
    const text = event.target.value;
    if (text !== "" && !/^\d+$/.test(text)) return;
    setDraft(text);
    if (text !== "") onChange(clamp(parseInt(text, 10)));
  };

  const step = (delta) => {
    setDraft(null);
    onChange(clamp(value + delta));
  };

  return (
    <div className="field">
      <div className="stepper">
        <span className="field__label">최대 인원</span>
        <div className="stepper__controls">
          <button
            type="button"
            className="stepper__btn"
            aria-label="최대 인원 감소"
            onClick={() => step(-1)}
            disabled={disabled || value <= min}
          >
            −
          </button>
          <input
            type="text"
            className="stepper__value"
            inputMode="numeric"
            aria-label="최대 인원"
            value={draft ?? String(value)}
            onChange={handleInput}
            onBlur={() => setDraft(null)}
            disabled={disabled}
          />
          <button
            type="button"
            className="stepper__btn"
            aria-label="최대 인원 증가"
            onClick={() => step(1)}
            disabled={disabled || value >= max}
          >
            +
          </button>
        </div>
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}
