import { useState } from "react";
import { MAX_DATE_RANGE_DAYS, NICKNAME_MAX_LENGTH } from "../constants/app";
import { useCreateRoom } from "../features/room/useCreateRoom";
import { addDays } from "../utils/date";

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
    name,
    setName,
    password,
    setPassword,
    loading,
    submit,
  } = useCreateRoom();

  // reason: 달력에서 고를 수 있는 범위를 최대 기간 안으로 제한
  const startMin = end ? addDays(end, -(MAX_DATE_RANGE_DAYS - 1)) : undefined;
  const endMax = start ? addDays(start, MAX_DATE_RANGE_DAYS - 1) : undefined;

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
            min={startMin}
            max={end || undefined}
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
            min={start || undefined}
            max={endMax}
            onChange={(e) => setEnd(e.target.value)}
            onClick={openDatePicker}
            onKeyDown={blockDateKeyboard}
            onPaste={(e) => e.preventDefault()}
          />
        </div>
      </div>

      <div className="mode-hint">
        날짜는 최대 {MAX_DATE_RANGE_DAYS}일까지 선택할 수 있어요
      </div>

      <div className="join-section-title">방장 정보</div>
      <div className="mode-hint">방에 다시 들어올 때 쓸 닉네임과 비밀번호예요</div>

      <input
        className="input"
        placeholder="닉네임"
        maxLength={NICKNAME_MAX_LENGTH}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />

      <input
        className="input"
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />

      <button type="button" className="button" onClick={handleSubmit} disabled={loading}>
        생성
      </button>
    </div>
  );
}
