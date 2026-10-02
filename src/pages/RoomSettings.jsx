import DateRangeFields from "../components/form/DateRangeFields";
import MaxPeopleStepper from "../components/form/MaxPeopleStepper";
import { TITLE_MAX_LENGTH } from "../constants/app";
import { ROUND_TITLE_MAX_LENGTH } from "../constants/limits";
import { useRoomSettings } from "../features/room/useRoomSettings";

export default function RoomSettings() {
  const {
    loading,
    form,
    roundNo,
    memberCount,
    preview,
    changed,
    saving,
    setTitle,
    setRoundTitle,
    setStart,
    setEnd,
    setMaxPeople,
    save,
    goBack,
  } = useRoomSettings();

  if (loading) return <div className="loading">loading...</div>;

  return (
    <div className="page">
      <button type="button" className="back-btn" onClick={goBack}>
        ← 돌아가기
      </button>

      <header className="topbar">
        <div>
          <h1 className="topbar__title">방 설정</h1>
          <p className="topbar__meta">방장만 바꿀 수 있어요 · 기간은 지금 진행 중인 {roundNo}회차 기준이에요</p>
        </div>
      </header>

      <section className="card form">
        <div className="field">
          <label className="field__label" htmlFor="settings-title">
            약속 이름
          </label>
          <input
            id="settings-title"
            className="input"
            maxLength={TITLE_MAX_LENGTH}
            value={form.title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="settings-round-title">
            회차 제목 <span className="field__optional">(선택)</span>
          </label>
          <input
            id="settings-round-title"
            className="input"
            placeholder={`${roundNo}회차`}
            maxLength={ROUND_TITLE_MAX_LENGTH}
            value={form.roundTitle}
            onChange={(e) => setRoundTitle(e.target.value)}
            disabled={saving}
          />
          <p className="field__hint">비워두면 "{roundNo}회차"로 표시돼요</p>
        </div>

        <DateRangeFields
          idPrefix="settings"
          start={form.start}
          end={form.end}
          onStartChange={setStart}
          onEndChange={setEnd}
          disabled={saving}
        />

        {preview.removedCount > 0 && (
          <p className="notice notice--warn" role="status">
            새 기간 밖으로 빠지는 투표가 있어요 · {preview.affected.length}명, 날짜 {preview.removedCount}개.
            저장하면 이 투표는 지워져요.
          </p>
        )}

        <MaxPeopleStepper
          value={form.maxPeople}
          onChange={setMaxPeople}
          min={Math.max(1, memberCount)}
          disabled={saving}
          hint={`지금 ${memberCount}명 참여 중이라 ${memberCount}명보다 적게는 줄일 수 없어요`}
        />
      </section>

      <button type="button" className="btn btn--lg" onClick={save} disabled={!changed || saving}>
        {saving ? "저장 중..." : changed ? "저장" : "바뀐 내용이 없어요"}
      </button>
    </div>
  );
}
