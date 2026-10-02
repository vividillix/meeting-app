import DateRangeFields from "../components/form/DateRangeFields";
import { ROUND_TITLE_MAX_LENGTH } from "../constants/limits";
import { useNextRound } from "../features/room/useNextRound";
import { formatMonthDay } from "../utils/date";

export default function NextRound() {
  const {
    loading,
    room,
    nextNo,
    memberCount,
    lastFinalDate,
    title,
    setTitle,
    start,
    setStart,
    end,
    setEnd,
    saving,
    submit,
    goBack,
  } = useNextRound();

  if (loading) return <div className="loading">loading...</div>;

  return (
    <div className="page">
      <button type="button" className="back-btn" onClick={goBack}>
        ← 돌아가기
      </button>

      <header className="topbar">
        <div>
          <h1 className="topbar__title">다음 회차 열기</h1>
          <p className="topbar__meta">{room.title}</p>
        </div>
      </header>

      <p className="notice notice--info">
        {lastFinalDate && `지난 회차는 ${formatMonthDay(lastFinalDate)}로 기록돼요. `}
        참가자 {memberCount}명은 그대로이고, 투표는 새로 시작해요.
      </p>

      <section className="card form">
        <div className="field">
          <label className="field__label" htmlFor="next-title">
            회차 제목 <span className="field__optional">(선택)</span>
          </label>
          <input
            id="next-title"
            className="input"
            placeholder={`${nextNo}회차`}
            maxLength={ROUND_TITLE_MAX_LENGTH}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
          />
          <p className="field__hint">비워두면 "{nextNo}회차"로 표시돼요</p>
        </div>

        <DateRangeFields
          idPrefix="next"
          start={start}
          end={end}
          onStartChange={setStart}
          onEndChange={setEnd}
          disabled={saving}
        />
      </section>

      <button type="button" className="btn btn--lg" onClick={submit} disabled={saving}>
        {saving ? "여는 중..." : `${title.trim() || `${nextNo}회차`} 투표 열기`}
      </button>
    </div>
  );
}
