import { useState } from "react";
import Avatar from "../components/Avatar";
import VoteCalendar from "../components/VoteCalendar";
import { useRoom } from "../features/room/useRoom";
import { buildAvatarColors } from "../utils/avatar";
import { formatMonthDay, formatWeekday } from "../utils/date";

const MAX_STACK = 5;

function RecommendCard({ voteSummary, total, getParticipantsForDate, colors }) {
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
  const date = hasMajority ? bestDates[0] : sorted[0][0];
  const people = getParticipantsForDate(date);
  const extra = hasMajority ? bestDates.length - 1 : 0;
  const percent = total ? Math.round((people.length / total) * 100) : 0;

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
          가능해요{extra > 0 ? ` · 같은 인원 ${extra}일 더` : ""}
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
    </section>
  );
}

function ParticipantsCard({ room, participants, session, isHost, busy, kickUser, colors }) {
  const votedCount = participants.filter((name) => room.votes[name]?.dates?.length).length;

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
          const voted = room.votes[name]?.dates?.length > 0;
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
        <span className="detail__hint">날짜를 누르면 선택되고, 그날 가능한 사람이 여기에 보여요</span>
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

function SaveButton({ dirty, saving, selectedCount, onSave }) {
  let content;
  let disabled = saving;

  if (saving) {
    content = "저장 중...";
  } else if (dirty) {
    content = (
      <>
        투표 저장 <span className="btn__badge">{selectedCount}일 선택</span>
      </>
    );
  } else if (selectedCount > 0) {
    content = (
      <>
        투표 완료 <span className="btn__badge">{selectedCount}일</span>
      </>
    );
    disabled = true;
  } else {
    content = "가능한 날을 골라주세요";
    disabled = true;
  }

  return (
    <div className="footer-bar">
      <button type="button" className="btn btn--lg" onClick={onSave} disabled={disabled}>
        {content}
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
    saving,
    busy,
    isHost,
    participants,
    voteSummary,
    toggleDate,
    submitVote,
    kickUser,
    leaveRoom,
    copyShareLink,
    getParticipantsForDate,
  } = useRoom();

  const [focusDate, setFocusDate] = useState(null);

  if (!room || !session) return <div className="loading">loading...</div>;

  const dates = room.dates || [];
  const total = participants.length;
  const colors = buildAvatarColors(participants);
  const detailDate =
    focusDate ?? voteSummary.bestDates[0] ?? voteSummary.sorted[0]?.[0] ?? null;

  // reason: 저장 전에도 내가 고른 결과가 달력·명단에 바로 보이게 내 선택만 로컬 값으로 반영
  const availableFor = (date) => {
    const others = getParticipantsForDate(date).filter((name) => name !== session.name);
    if (!selected.includes(date)) return others;
    return participants.filter((name) => name === session.name || others.includes(name));
  };

  const handleToggle = (date) => {
    toggleDate(date);
    setFocusDate(date);
  };

  return (
    <div className="page page--with-footer">
      <header className="topbar">
        <div>
          <h1 className="topbar__title">{room.title}</h1>
          {dates.length > 0 && (
            <p className="topbar__meta">
              {formatMonthDay(dates[0])} – {formatMonthDay(dates[dates.length - 1])} · {total}명 참여 중
            </p>
          )}
        </div>
        <div className="topbar__actions">
          <button type="button" className="pill-btn" onClick={copyShareLink}>
            공유
          </button>
          <button type="button" className="pill-btn" onClick={leaveRoom} disabled={busy}>
            {isHost ? "방 삭제" : "나가기"}
          </button>
        </div>
      </header>

      <RecommendCard
        voteSummary={voteSummary}
        total={total}
        getParticipantsForDate={getParticipantsForDate}
        colors={colors}
      />

      <ParticipantsCard
        room={room}
        participants={participants}
        session={session}
        isHost={isHost}
        busy={busy}
        kickUser={kickUser}
        colors={colors}
      />

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">가능한 날을 눌러주세요</h2>
          <span className="card__sub">진할수록 많이 가능</span>
        </div>

        <VoteCalendar
          dates={dates}
          total={total}
          selected={selected}
          focusDate={detailDate}
          countFor={(date) => availableFor(date).length}
          onToggle={handleToggle}
        />

        <DateDetail date={detailDate} participants={participants} availableFor={availableFor} />
      </section>

      <SaveButton
        dirty={dirty}
        saving={saving}
        selectedCount={selected.length}
        onSave={submitVote}
      />
    </div>
  );
}
