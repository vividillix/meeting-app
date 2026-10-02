import SecretInput from "../components/SecretInput";
import { NICKNAME_MAX_LENGTH } from "../constants/app";
import { useJoinRoom } from "../features/room/useJoinRoom";
import { finalDateOf, memberNames, roundDates } from "../services/roomService";
import { formatMonthDay } from "../utils/date";

export default function Join() {
  const {
    room,
    loading,
    mode,
    setMode,
    name,
    setName,
    password,
    setPassword,
    submitting,
    enter,
  } = useJoinRoom();

  if (loading || !room) return <div className="loading">loading...</div>;

  const dates = roundDates(room);
  const memberCount = memberNames(room).length;
  const finalDate = finalDateOf(room);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") enter();
  };

  return (
    <div className="page page--center">
      <header className="topbar">
        <div>
          <h1 className="topbar__title">{room.title}</h1>
          <p className="topbar__meta">
            {dates.length > 0 &&
              `${formatMonthDay(dates[0])} – ${formatMonthDay(dates[dates.length - 1])} · `}
            {memberCount}/{room.maxPeople}명 참여 중
          </p>
        </div>
      </header>

      <section className="card form">
        <div className="card__head" style={{ marginBottom: 0 }}>
          <h2 className="card__title">입장</h2>
        </div>

        <div className="segmented" role="group" aria-label="입장 방식">
          <button
            type="button"
            aria-pressed={mode === "new"}
            className={`segmented__item ${mode === "new" ? "segmented__item--active" : ""}`}
            onClick={() => setMode("new")}
          >
            신규
          </button>
          <button
            type="button"
            aria-pressed={mode === "existing"}
            className={`segmented__item ${mode === "existing" ? "segmented__item--active" : ""}`}
            onClick={() => setMode("existing")}
          >
            기존
          </button>
        </div>

        {finalDate && (
          <p className="notice notice--info">
            이 약속은 {formatMonthDay(finalDate)}로 확정됐어요. 들어가면 결과를 볼 수 있어요.
          </p>
        )}

        <p className="hint">
          {mode === "new" ? "새로 참여하는 멤버입니다" : "이미 참여한 멤버입니다"}
        </p>

        <input
          className="input"
          placeholder="닉네임"
          aria-label="닉네임"
          maxLength={NICKNAME_MAX_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <SecretInput
          className="input"
          placeholder="비밀번호"
          aria-label="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <p className="field__hint">
          {mode === "new"
            ? "다른 기기에서 다시 들어올 때 이 닉네임과 비밀번호를 써요"
            : "처음 입장할 때 정한 닉네임과 비밀번호를 입력해 주세요"}
        </p>

        <button type="button" className="btn btn--lg" onClick={enter} disabled={submitting}>
          입장
        </button>
      </section>
    </div>
  );
}
