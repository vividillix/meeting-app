import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MAX_DATE_RANGE_DAYS,
  MAX_PEOPLE,
  NICKNAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "../constants/app";
import { ROUTES } from "../constants/routes";
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
  const nav = useNavigate();
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

    return Math.min(parsed, MAX_PEOPLE);
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
    const next = Math.min(MAX_PEOPLE, resolveMaxPeople() + 1);
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
    <div className="page">
      <button type="button" className="back-btn" onClick={() => nav(ROUTES.HOME)}>
        ← 홈
      </button>

      <header className="topbar">
        <div>
          <h1 className="topbar__title">새 약속 만들기</h1>
          <p className="topbar__meta">날짜 범위를 정하고 링크를 공유하면 끝이에요</p>
        </div>
      </header>

      <section className="card form">
        <div className="field">
          <label className="field__label" htmlFor="create-title">
            약속 이름
          </label>
          <input
            id="create-title"
            className="input"
            placeholder="예: 10월 동기 모임"
            maxLength={TITLE_MAX_LENGTH}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="date-row">
          <div className="field">
            <label className="field__label" htmlFor="create-start">
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
              disabled={loading}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="create-end">
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
              disabled={loading}
            />
          </div>
        </div>
        <p className="field__hint" style={{ marginTop: "-0.5rem" }}>
          날짜는 최대 {MAX_DATE_RANGE_DAYS}일까지 선택할 수 있어요
        </p>

        <div className="stepper">
          <span className="field__label">최대 인원</span>
          <div className="stepper__controls">
            <button
              type="button"
              className="stepper__btn"
              aria-label="최대 인원 감소"
              onClick={decreaseMaxPeople}
              disabled={loading || resolveMaxPeople() <= 1}
            >
              −
            </button>
            <input
              type="text"
              className="stepper__value"
              inputMode="numeric"
              aria-label="최대 인원"
              value={maxPeopleDraft}
              onChange={handleMaxPeopleChange}
              onBlur={syncMaxPeople}
              disabled={loading}
            />
            <button
              type="button"
              className="stepper__btn"
              aria-label="최대 인원 증가"
              onClick={increaseMaxPeople}
              disabled={loading || resolveMaxPeople() >= MAX_PEOPLE}
            >
              +
            </button>
          </div>
        </div>
      </section>

      <section className="card form">
        <div>
          <h2 className="card__title">방장 정보</h2>
          <p className="field__hint" style={{ marginTop: "0.25rem" }}>
            방에 다시 들어올 때 쓸 닉네임과 비밀번호예요
          </p>
        </div>

        <input
          className="input"
          placeholder="닉네임"
          aria-label="닉네임"
          maxLength={NICKNAME_MAX_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />

        <input
          className="input"
          type="password"
          placeholder="비밀번호"
          aria-label="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </section>

      <button type="button" className="btn btn--lg" onClick={handleSubmit} disabled={loading}>
        {loading ? "만드는 중..." : "약속 만들기"}
      </button>
    </div>
  );
}
