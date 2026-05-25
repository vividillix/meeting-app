import { useState } from "react";
import { useRoom } from "../features/room/useRoom";

export default function Room() {
  const {
    room,
    session,
    selected,
    isHost,
    participants,
    voteSummary,
    toggleDate,
    submitVote,
    kickUser,
    leaveRoom,
    copyShareLink,
    getParticipantsForDate,
    isDateSelectedByOthers,
  } = useRoom();

  const [resultPopupDate, setResultPopupDate] = useState(null);

  if (!room || !session) return <div className="loading">loading...</div>;

  const { sorted, bestDates, noResult } = voteSummary;

  const toggleResultPopup = (date) => {
    setResultPopupDate((prev) => (prev === date ? null : date));
  };

  return (
    <div className="container container--room">
      <div className="header">
        <div className="room-title">{room.title}</div>

        <div className="header-actions">
          <button type="button" className="text-btn" onClick={copyShareLink}>
            공유
          </button>

          <button type="button" className="text-btn" onClick={leaveRoom}>
            나가기
          </button>
        </div>
      </div>

      <div className="middle">
        <div className="participants-box">
          <div className="section-label">참가자 목록</div>
          {participants.map((p) => (
            <div key={p} className="participant-row">
              <span>{p}</span>

              {isHost && p !== session.name && (
                <button
                  type="button"
                  className="text-btn text-btn--danger"
                  onClick={() => kickUser(p)}
                >
                  내보내기
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="dates-box">
          <div className="section-label">투표날짜</div>
          <div className="dates-list">
            {room.dates.map((date) => {
              const d = String(date);
              const isMine = selected.includes(d);
              const isOthers = isDateSelectedByOthers(d);

              const itemClass = [
                "date-item",
                isMine ? "selected" : "",
                !isMine && isOthers ? "others-selected" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div key={d} className={itemClass}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleDate(d)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleDate(d);
                      }
                    }}
                  >
                    {d}
                    {isMine && <span className="selected-badge">선택됨</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button type="button" className="vote-btn" onClick={submitVote}>
          투표하기
        </button>

        <div className="result-section">
          <div className="result-box">
            <div className="section-label">투표결과</div>

            {noResult && (
              <div className="no-result">아쉽게도 우리는 만날 수 없나봐요</div>
            )}

            {sorted.length > 0 && (
              <div className="result-list">
                {sorted.map(([date, count]) => {
                  const isBest = bestDates.includes(date);

                  return (
                    <button
                      key={date}
                      type="button"
                      className={`result-item ${isBest ? "best" : ""} ${
                        resultPopupDate === date ? "result-item--active" : ""
                      }`}
                      onClick={() => toggleResultPopup(date)}
                    >
                      {isBest && "추천 · "}
                      {date} ({count}명)
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {resultPopupDate && (
            <div className="result-voters-popup" role="status">
              <div className="result-voters-popup__header">
                <span>{resultPopupDate} 투표자</span>
                <button
                  type="button"
                  className="result-voters-popup__close"
                  aria-label="투표자 목록 닫기"
                  onClick={() => setResultPopupDate(null)}
                >
                  닫기
                </button>
              </div>
              <p className="result-voters-popup__names">
                {getParticipantsForDate(resultPopupDate).join(", ") || "없음"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
