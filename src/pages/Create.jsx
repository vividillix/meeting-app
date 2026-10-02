import { useNavigate } from "react-router-dom";
import DateRangeFields from "../components/form/DateRangeFields";
import MaxPeopleStepper from "../components/form/MaxPeopleStepper";
import SecretInput from "../components/SecretInput";
import { NICKNAME_MAX_LENGTH, TITLE_MAX_LENGTH } from "../constants/app";
import { ROUTES } from "../constants/routes";
import { useCreateRoom } from "../features/room/useCreateRoom";

export default function Create() {
  const nav = useNavigate();
  const {
    title,
    setTitle,
    start,
    setStart,
    end,
    setEnd,
    maxPeople,
    setMaxPeople,
    name,
    setName,
    password,
    setPassword,
    loading,
    submit,
  } = useCreateRoom();

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

        <DateRangeFields
          idPrefix="create"
          start={start}
          end={end}
          onStartChange={setStart}
          onEndChange={setEnd}
          disabled={loading}
        />

        <MaxPeopleStepper value={maxPeople} onChange={setMaxPeople} disabled={loading} />
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

        <SecretInput
          className="input"
          placeholder="비밀번호"
          aria-label="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </section>

      <button type="button" className="btn btn--lg" onClick={() => submit()} disabled={loading}>
        {loading ? "만드는 중..." : "약속 만들기"}
      </button>
    </div>
  );
}
