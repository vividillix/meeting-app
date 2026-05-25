import { useState } from "react";
import { useCreateRoom } from "../features/room/useCreateRoom";

const DEFAULT_MAX_PEOPLE = 2;

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

export default function Create() {
  const {
    title,
    setTitle,
    start,
    setStart,
    end,
    setEnd,
    setMaxPeople,
    loading,
    submit,
  } = useCreateRoom();

  const [maxPeopleDraft, setMaxPeopleDraft] = useState(String(DEFAULT_MAX_PEOPLE));

  const resolveMaxPeople = () => {
    if (maxPeopleDraft === "") return DEFAULT_MAX_PEOPLE;

    const parsed = parseInt(maxPeopleDraft, 10);
    if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_MAX_PEOPLE;

    return parsed;
  };

  const syncMaxPeople = () => {
    const resolved = resolveMaxPeople();
    setMaxPeople(resolved);
    setMaxPeopleDraft(String(resolved));
    return resolved;
  };

  const decreaseMaxPeople = () => {
    const next = Math.max(1, resolveMaxPeople() - 1);
    setMaxPeople(next);
    setMaxPeopleDraft(String(next));
  };

  const increaseMaxPeople = () => {
    const next = resolveMaxPeople() + 1;
    setMaxPeople(next);
    setMaxPeopleDraft(String(next));
  };

  const handleMaxPeopleChange = (event) => {
    const { value } = event.target;
    if (value === "" || /^\d+$/.test(value)) {
      setMaxPeopleDraft(value);
    }
  };

  const handleSubmit = () => {
    const resolved = syncMaxPeople();
    submit({ maxPeople: resolved });
  };

  return (
    <div className="container">
      <div className="title">방 생성</div>

      <input
        className="input"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="number-stepper">
        <span className="number-stepper-label">최대 인원</span>
        <div className="number-stepper-controls">
          <button
            type="button"
            className="stepper-btn"
            aria-label="최대 인원 감소"
            onClick={decreaseMaxPeople}
            disabled={loading || resolveMaxPeople() <= 1}
          >
            −
          </button>
          <input
            type="text"
            className="stepper-value"
            inputMode="numeric"
            aria-label="최대 인원"
            value={maxPeopleDraft}
            onChange={handleMaxPeopleChange}
            onBlur={syncMaxPeople}
            disabled={loading}
          />
          <button
            type="button"
            className="stepper-btn"
            aria-label="최대 인원 증가"
            onClick={increaseMaxPeople}
            disabled={loading}
          >
            +
          </button>
        </div>
      </div>

      <div className="date-row">
        <div className="date-field">
          <label className="date-label" htmlFor="create-start">
            시작일
          </label>
          <input
            id="create-start"
            className="input date-input"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            onClick={openDatePicker}
            onKeyDown={blockDateKeyboard}
            onPaste={(e) => e.preventDefault()}
          />
        </div>

        <div className="date-field">
          <label className="date-label" htmlFor="create-end">
            종료일
          </label>
          <input
            id="create-end"
            className="input date-input"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onClick={openDatePicker}
            onKeyDown={blockDateKeyboard}
            onPaste={(e) => e.preventDefault()}
          />
        </div>
      </div>

      <button type="button" className="button" onClick={handleSubmit} disabled={loading}>
        생성
      </button>
    </div>
  );
}
