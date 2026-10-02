import { useState } from "react";
import { formatMonthDay, formatWeekday } from "../utils/date";

/**
 * 방장이 확정할 날짜를 고르는 창.
 * candidates: [[날짜, 가능 인원], ...] 인원 많은 순
 */
export default function FinalizeSheet({ candidates, total, notVoted, busy, onConfirm, onClose }) {
  const [picked, setPicked] = useState(candidates[0]?.[0] ?? null);
  const voted = candidates.filter(([, count]) => count > 0);
  // reason: 아무도 안 되는 날까지 다 보이면 목록이 길어짐 → 기본은 투표가 있는 날만
  const [showAll, setShowAll] = useState(voted.length === 0);
  const visible = showAll ? candidates : voted;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog dialog--sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finalize-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="finalize-title" className="dialog__title">
          약속 날짜 확정
        </h2>
        <p className="dialog__message">확정하면 투표가 끝나고, 모두에게 확정된 날짜가 보여요.</p>

        {notVoted.length > 0 && (
          <p className="notice notice--warn" style={{ marginTop: "0.75rem" }}>
            {notVoted.length}명이 아직 투표하지 않았어요 · {notVoted.join(", ")}
          </p>
        )}

        <div className="pick-list" role="radiogroup" aria-label="확정할 날짜">
          {visible.map(([date, count]) => (
            <label key={date} className={`pick-item ${picked === date ? "pick-item--active" : ""}`}>
              <input
                type="radio"
                name="final-date"
                value={date}
                checked={picked === date}
                onChange={() => setPicked(date)}
              />
              <span className="pick-item__date">
                {formatMonthDay(date)} ({formatWeekday(date).slice(0, 1)})
              </span>
              <span className="pick-item__count">
                {count}/{total}명
              </span>
            </label>
          ))}
        </div>

        {!showAll && voted.length < candidates.length && (
          <button type="button" className="text-link" onClick={() => setShowAll(true)}>
            투표 없는 날짜도 보기 ({candidates.length - voted.length}일)
          </button>
        )}

        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onConfirm(picked)}
            disabled={!picked || busy}
          >
            {busy ? "확정 중..." : "이 날짜로 확정"}
          </button>
        </div>
      </div>
    </div>
  );
}
