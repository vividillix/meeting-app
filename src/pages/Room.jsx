import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import FinalizeSheet from "../components/FinalizeSheet";
import { useFeedback } from "../components/feedback/feedbackContext";
import { ChevronIcon, HomeIcon } from "../components/icons";
import MoreMenu from "../components/MoreMenu";
import { ROOM_RETENTION_MONTHS } from "../constants/limits";
import { ROUTES } from "../constants/routes";
import VoteCalendar from "../components/VoteCalendar";
import { useRoom } from "../features/room/useRoom";
import { buildShareLink, roundLabel } from "../services/roomService";
import { buildAvatarColors } from "../utils/avatar";
import { downloadIcs, googleCalendarUrl } from "../utils/calendarExport";
import { formatMonthDay, formatWeekday } from "../utils/date";

const MAX_STACK = 5;

// 가장 많이 겹치는 날들 (과반이 되는 날이 있으면 그중에서)
function getTopDates({ sorted, bestDates }) {
  if (bestDates.length > 0) return bestDates;
  if (sorted.length === 0) return [];
  const topCount = sorted[0][1];
  return sorted.filter(([, count]) => count === topCount).map(([date]) => date);
}

function shortDate(date) {
  return `${formatMonthDay(date).replace("월 ", "/").replace("일", "")}(${formatWeekday(date).slice(0, 1)})`;
}

function RecommendCard({ voteSummary, total, getParticipantsForDate, colors, pickedDate, onPick }) {
  const [showRanking, setShowRanking] = useState(false);
  const { sorted, bestDates } = voteSummary;

  if (sorted.length === 0) {
    return (
      <section className="card hero hero--empty">
        <div className="hero__label">추천 날짜</div>
        <div className="hero__date">아직 투표한 사람이 없어요</div>
        <p className="hero__desc">가능한 날을 골라 첫 투표를 해보세요</p>
      </section>
    );
  }

  // 과반이 되는 날이 없으면 가장 많이 겹치는 날을 대신 보여줌
  const hasMajority = bestDates.length > 0;
  const topDates = getTopDates(voteSummary);
  // reason: 동점 날짜 칩을 누르면 카드의 큰 날짜도 그 날로 바뀌게 함
  const date = topDates.includes(pickedDate) ? pickedDate : topDates[0];
  const people = getParticipantsForDate(date);
  const percent = total ? Math.round((people.length / total) * 100) : 0;
  const maxCount = sorted[0][1];

  return (
    <section className="card hero" aria-live="polite">
      <div className="hero__label">
        {hasMajority ? "지금 가장 많이 되는 날" : "아직 과반이 되는 날은 없어요 · 가장 많은 날"}
      </div>
      <div className="hero__date">
        {formatMonthDay(date)}
        <span className="hero__weekday">{formatWeekday(date)}</span>
      </div>
      <div className="hero__row">
        <span>
          <b>
            {total}명 중 {people.length}명
          </b>{" "}
          가능해요
        </span>
        <span className="avatar-stack">
          {people.slice(0, MAX_STACK).map((name) => (
            <Avatar key={name} name={name} color={colors.get(name)} />
          ))}
          {people.length > MAX_STACK && (
            <span className="avatar avatar-stack__more">+{people.length - MAX_STACK}</span>
          )}
        </span>
      </div>
      <div className="hero__bar">
        <div className="hero__bar-fill" style={{ width: `${percent}%` }} />
      </div>

      {topDates.length > 1 && (
        <div className="hero__ties">
          <span className="hero__ties-label">같은 인원 {topDates.length}일</span>
          <div className="chips">
            {topDates.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${d === date ? "chip--active" : ""}`}
                aria-pressed={d === date}
                onClick={() => onPick(d)}
              >
                {shortDate(d)}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="hero__toggle"
        aria-expanded={showRanking}
        onClick={() => setShowRanking((v) => !v)}
      >
        전체 순위 {showRanking ? "접기" : "보기"} <ChevronIcon up={showRanking} />
      </button>

      {showRanking && (
        <ol className="ranking">
          {sorted.map(([d, count], index) => {
            // 같은 인원이면 같은 순위, 순위 글자는 그 그룹의 첫 줄에만
            const rank = sorted.findIndex(([, c]) => c === count) + 1;
            const showRank = index === 0 || sorted[index - 1][1] !== count;
            return (
              <li key={d}>
                <button
                  type="button"
                  className={`ranking__row ${d === pickedDate ? "ranking__row--active" : ""}`}
                  onClick={() => onPick(d)}
                >
                  <span className="ranking__rank">{showRank ? `${rank}위` : ""}</span>
                  <span className="ranking__date">{shortDate(d)}</span>
                  <span className="ranking__bar">
                    <span style={{ width: `${(count / maxCount) * 100}%` }} />
                  </span>
                  <span className="ranking__count">{count}명</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// 날짜가 확정된 방: 맨 위에 확정 카드
function FinalCard({ room, roomId, finalDate, total, getParticipantsForDate, colors }) {
  const people = getParticipantsForDate(finalDate);
  const calendarInfo = { title: room.title, date: finalDate, url: buildShareLink(roomId), uid: roomId };

  return (
    <section className="card hero hero--final" aria-live="polite">
      <div className="hero__label">확정된 약속</div>
      <div className="hero__date">
        {formatMonthDay(finalDate)}
        <span className="hero__weekday">{formatWeekday(finalDate)}</span>
      </div>
      <div className="hero__row">
        <span>
          <b>
            {total}명 중 {people.length}명
          </b>{" "}
          가능했어요
        </span>
        <span className="avatar-stack">
          {people.slice(0, MAX_STACK).map((name) => (
            <Avatar key={name} name={name} color={colors.get(name)} />
          ))}
          {people.length > MAX_STACK && (
            <span className="avatar avatar-stack__more">+{people.length - MAX_STACK}</span>
          )}
        </span>
      </div>

      <div className="hero__actions">
        <a
          className="btn btn--ghost hero__action"
          href={googleCalendarUrl(calendarInfo)}
          target="_blank"
          rel="noreferrer"
        >
          구글 캘린더에 추가
        </a>
        <button
          type="button"
          className="btn btn--ghost hero__action"
          onClick={() => downloadIcs(calendarInfo)}
        >
          다른 캘린더 (.ics)
        </button>
      </div>

      <p className="hero__notice">
        투표가 끝났어요. 마지막 약속일로부터 {ROOM_RETENTION_MONTHS}개월이 지나면 이 방은 자동으로
        사라져요. 다음 회차를 열면 기간이 연장돼요.
      </p>
    </section>
  );
}

// 지난 회차들의 확정일 (최근 회차가 위)
function HistoryCard({ history }) {
  if (!history?.length) return null;

  return (
    <section className="card">
      <div className="card__head">
        <h2 className="card__title">지난 약속</h2>
        <span className="card__sub">{history.length}번 만났어요</span>
      </div>
      <ul className="history">
        {[...history].reverse().map((item) => (
          <li key={item.no} className="history__item">
            <span className="history__label">{roundLabel(item)}</span>
            <span className="history__date">
              {item.finalDate
                ? `${formatMonthDay(item.finalDate)} (${formatWeekday(item.finalDate).slice(0, 1)})`
                : "확정일 없음"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ParticipantsCard({ room, votes, participants, session, isHost, busy, kickUser, colors }) {
  const votedCount = participants.filter((name) => votes[name]?.dates?.length).length;

  return (
    <section className="card">
      <div className="card__head">
        <h2 className="card__title">참가자</h2>
        <span className="card__sub">
          {votedCount}명 투표 완료 · 최대 {room.maxPeople}명
        </span>
      </div>

      <div className="people">
        {participants.map((name) => {
          const voted = votes[name]?.dates?.length > 0;
          const isMe = name === session.name;
          const isHostName = name === room.hostId;

          let label;
          if (isHostName) {
            label = <span className="person__label">방장</span>;
          } else if (isHost) {
            label = (
              <button
                type="button"
                className="person__kick"
                onClick={() => kickUser(name)}
                disabled={busy}
              >
                내보내기
              </button>
            );
          } else if (!voted) {
            label = <span className="person__label person__label--muted">아직</span>;
          } else {
            label = <span className="person__label" />;
          }

          return (
            <div key={name} className={`person ${voted ? "" : "person--waiting"}`}>
              <Avatar name={name} size="lg" color={colors.get(name)} />
              {voted && <span className="person__check" aria-label="투표 완료" />}
              <span className="person__name" title={name}>
                {name}
                {isMe ? " (나)" : ""}
              </span>
              {label}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DateDetail({ date, participants, availableFor }) {
  if (!date) {
    return (
      <div className="detail">
        <span className="detail__hint">날짜를 누르면 그날 가능한 사람이 여기에 보여요</span>
      </div>
    );
  }

  const available = availableFor(date);

  return (
    <div className="detail">
      <b className="detail__title">
        {formatMonthDay(date)} ({formatWeekday(date).slice(0, 1)}) · {available.length}명 가능
      </b>
      <div className="tags">
        {participants.map((name) => (
          <span key={name} className={`tag ${available.includes(name) ? "" : "tag--no"}`}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function FooterActions({ editing, hasVoted, dirty, saving, selectedCount, onSave, onEdit, onCancel }) {
  // 보기 모드: 저장된 투표가 있고 수정 중이 아님
  if (!editing) {
    return (
      <div className="footer-bar">
        <button type="button" className="btn btn--lg btn--ghost" onClick={onEdit}>
          투표 수정하기 <span className="btn__badge btn__badge--soft">{selectedCount}일 선택됨</span>
        </button>
      </div>
    );
  }

  let label;
  if (saving) {
    label = "저장 중...";
  } else if (selectedCount === 0 && !dirty) {
    label = "가능한 날을 골라주세요";
  } else {
    label = (
      <>
        투표 저장 <span className="btn__badge">{selectedCount}일 선택</span>
      </>
    );
  }

  // reason: 처음 투표할 때는 저장만, 수정할 때는 바꾸기 전으로 돌아갈 수 있게 취소도 둠
  return (
    <div className="footer-bar footer-bar--split">
      {hasVoted && (
        <button
          type="button"
          className="btn btn--lg btn--ghost footer-bar__cancel"
          onClick={onCancel}
          disabled={saving}
        >
          취소
        </button>
      )}
      <button type="button" className="btn btn--lg" onClick={onSave} disabled={saving || !dirty}>
        {label}
      </button>
    </div>
  );
}

export default function Room() {
  const {
    room,
    session,
    selected,
    dirty,
    hasVoted,
    editing,
    closed,
    finalDate,
    votes,
    dates,
    finalize,
    reopen,
    startEditing,
    cancelEditing,
    saving,
    busy,
    isHost,
    participants,
    voteSummary,
    toggleDate,
    submitVote,
    kickUser,
    leaveRoom,
    shareLink,
    getParticipantsForDate,
  } = useRoom();

  const nav = useNavigate();
  const { confirm } = useFeedback();
  const [focusDate, setFocusDate] = useState(null);
  const [showFinalize, setShowFinalize] = useState(false);
  const location = useLocation();
  const announcedRef = useRef(false);

  // reason: 다음 회차를 막 연 방장에게 링크를 다시 공유하라고 한 번 안내
  useEffect(() => {
    if (!room || announcedRef.current || !location.state?.announceRound) return;
    announcedRef.current = true;
    nav(location.pathname, { replace: true, state: null });

    confirm({
      title: `${roundLabel(room.round)} 투표가 열렸어요`,
      message: "카톡방에 링크를 다시 보내서 새 투표를 알려주세요.",
      confirmText: "공유하기",
      cancelText: "나중에",
    }).then((ok) => {
      if (ok) shareLink();
    });
  }, [room, location.state, location.pathname, nav, confirm, shareLink]);

  if (!room || !session) return <div className="loading">loading...</div>;

  const total = participants.length;
  // 한 번만 쓰는 약속에 "1회차"가 붙지 않게, 2회차부터 또는 제목을 정했을 때만 표시
  const showRoundLabel = (room.round?.no ?? 1) > 1 || !!room.round?.title;
  const colors = buildAvatarColors(participants);
  const detailDate =
    focusDate ?? finalDate ?? voteSummary.bestDates[0] ?? voteSummary.sorted[0]?.[0] ?? null;

  // reason: 저장 전에도 내가 고른 결과가 달력·명단에 바로 보이게 내 선택만 로컬 값으로 반영
  const availableFor = (date) => {
    const others = getParticipantsForDate(date).filter((name) => name !== session.name);
    if (!selected.includes(date)) return others;
    return participants.filter((name) => name === session.name || others.includes(name));
  };

  // reason: 저장 안 한 투표가 있으면 다른 화면으로 가기 전에 한 번 물어봄
  const leaveTo = async (path) => {
    if (dirty) {
      const ok = await confirm({
        title: "저장하지 않은 투표가 있어요",
        message: "이동하면 지금 고른 날짜가 저장되지 않아요.",
        confirmText: "이동",
      });
      if (!ok) return;
    }
    nav(path);
  };

  const goNextRound = () => leaveTo(ROUTES.nextRound(session.id));

  const hostItems = closed
    ? [
        { label: "다음 회차 열기", onSelect: goNextRound },
        { label: "확정 취소", onSelect: reopen, disabled: busy },
      ]
    : [
        { label: "방 설정", onSelect: () => leaveTo(ROUTES.roomSettings(session.id)) },
        { label: "날짜 확정", onSelect: () => setShowFinalize(true), disabled: busy },
      ];

  const menuItems = [
    ...(isHost ? hostItems : []),
    { label: isHost ? "방 삭제" : "방 나가기", onSelect: leaveRoom, danger: true, disabled: busy },
  ];

  // 확정창 후보: 모든 날짜를 가능 인원 많은 순으로
  const candidates = dates
    .map((date) => [date, getParticipantsForDate(date).length])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const notVoted = participants.filter((name) => !votes[name]?.dates?.length);

  const handleFinalize = async (date) => {
    if (await finalize(date)) {
      setShowFinalize(false);
      setFocusDate(null);
    }
  };

  // 수정 모드면 내 투표를 바꾸고, 보기 모드면 그날 가능한 사람만 보여줌
  const handleDatePress = (date) => {
    if (editing) toggleDate(date);
    setFocusDate(date);
  };

  return (
    <div className="page page--with-footer">
      <header className="topbar topbar--room">
        <button type="button" className="icon-btn topbar__home" aria-label="홈으로" onClick={() => leaveTo(ROUTES.HOME)}>
          <HomeIcon />
        </button>
        <div className="topbar__text">
          <h1 className="topbar__title">{room.title}</h1>
          {dates.length > 0 && (
            <p className="topbar__meta">
              {showRoundLabel && <b className="topbar__round">{roundLabel(room.round)}</b>}
              {formatMonthDay(dates[0])} – {formatMonthDay(dates[dates.length - 1])}{" "}
              <span className="nowrap">· {total}명 참여 중</span>
            </p>
          )}
        </div>
        <div className="topbar__actions">
          <button type="button" className="pill-btn" onClick={shareLink}>
            공유
          </button>
          <MoreMenu items={menuItems} />
        </div>
      </header>

      {closed ? (
        <FinalCard
          room={room}
          roomId={session.id}
          finalDate={finalDate}
          total={total}
          getParticipantsForDate={getParticipantsForDate}
          colors={colors}
        />
      ) : (
        <RecommendCard
          voteSummary={voteSummary}
          total={total}
          getParticipantsForDate={getParticipantsForDate}
          colors={colors}
          pickedDate={detailDate}
          onPick={setFocusDate}
        />
      )}

      <section className={`card ${editing ? "card--editing" : ""}`}>
        <div className="card__head">
          <h2 className="card__title">
            {editing ? "가능한 날을 눌러주세요" : closed ? "투표 결과" : "날짜별 가능 인원"}
          </h2>
          <span className="card__sub">
            {editing ? "진할수록 많이 가능" : "날짜를 누르면 명단이 보여요"}
          </span>
        </div>

        <VoteCalendar
          dates={dates}
          total={total}
          selected={selected}
          focusDate={detailDate}
          finalDate={finalDate}
          countFor={(date) => availableFor(date).length}
          onToggle={handleDatePress}
        />

        <DateDetail date={detailDate} participants={participants} availableFor={availableFor} />
      </section>

      <ParticipantsCard
        room={room}
        votes={votes}
        participants={participants}
        session={session}
        isHost={isHost}
        busy={busy}
        kickUser={kickUser}
        colors={colors}
      />

      <HistoryCard history={room.history} />

      {closed ? (
        <div className={`footer-bar ${isHost ? "footer-bar--split" : ""}`}>
          <button
            type="button"
            className={`btn btn--lg btn--ghost ${isHost ? "footer-bar__cancel footer-bar__new" : ""}`}
            onClick={() => leaveTo(ROUTES.CREATE)}
          >
            {isHost ? "새 약속" : "새 약속 만들기"}
          </button>
          {isHost && (
            <button type="button" className="btn btn--lg" onClick={goNextRound}>
              다음 회차 열기
            </button>
          )}
        </div>
      ) : (
        <FooterActions
          editing={editing}
          hasVoted={hasVoted}
          dirty={dirty}
          saving={saving}
          selectedCount={selected.length}
          onSave={submitVote}
          onEdit={startEditing}
          onCancel={cancelEditing}
        />
      )}

      {showFinalize && (
        <FinalizeSheet
          candidates={candidates}
          total={total}
          notVoted={notVoted}
          busy={busy}
          onConfirm={handleFinalize}
          onClose={() => setShowFinalize(false)}
        />
      )}
    </div>
  );
}
