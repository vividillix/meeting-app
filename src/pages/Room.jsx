import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";

export default function Room() {
  const { id } = useParams();
  const nav = useNavigate();

  const [room, setRoom] = useState(null);
  const [selected, setSelected] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));

  /* ================== 로그인 체크 ================== */
  useEffect(() => {
    if (!user || user.id !== id) {
      alert("로그인 필요");
      nav(`/join/${id}`);
    }
  }, [id]);

  /* ================== 데이터 가져오기 ================== */
  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "rooms", id));

      if (!snap.exists()) {
        alert("방이 존재하지 않음");
        nav("/");
        return;
      }

      setRoom(snap.data());
    };

    fetch();
  }, [id]);

  /* ================== 내 투표 복원 ================== */
  useEffect(() => {
    if (room && user) {
      setSelected(room.votes?.[user.name]?.dates || []);
    }
  }, [room]);

  if (!room) return <div>loading...</div>;

  const isHost = user?.name === room?.hostId;
  const votes = room.votes || {};

  /* ================== 날짜 선택 ================== */
  const toggle = (date) => {
    setSelected(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  /* ================== 투표 저장 ================== */
  const submitVote = async () => {
    await updateDoc(doc(db, "rooms", id), {
      [`votes.${user.name}.dates`]: selected
    });

    setRoom(prev => ({
      ...prev,
      votes: {
        ...prev.votes,
        [user.name]: {
          ...prev.votes[user.name],
          dates: selected
        }
      }
    }));

    alert("저장 완료");
  };

  /* ================== 강퇴 ================== */
  const kickUser = async (target) => {
    if (!isHost) {
      alert("방장만 가능");
      return;
    }

    await updateDoc(doc(db, "rooms", id), {
      [`votes.${target}`]: deleteField()
    });

    setRoom(prev => {
      const newVotes = { ...prev.votes };
      delete newVotes[target];

      return { ...prev, votes: newVotes };
    });
  };

  /* ================== 링크 복사 ================== */
  const copyLink = async () => {
    const url = `${window.location.origin}/join/${id}`;
    await navigator.clipboard.writeText(url);
    alert("복사됨");
  };

  /* ================== 날짜별 투표 수 ================== */
  const results = {};

  Object.values(votes).forEach(user => {
    if (!user || !Array.isArray(user.dates)) return;

    user.dates.forEach(date => {
      results[date] = (results[date] || 0) + 1;
    });
  });

  /* ================== 정렬 ================== */
  const sorted = Object.entries(results).sort((a, b) => {
    if (b[1] === a[1]) return a[0].localeCompare(b[0]);
    return b[1] - a[1];
  });

  /* ================== 과반 + 최다 ================== */
  const total = Object.keys(votes).length;
  const majority = Math.floor(total / 2) + 1;

  const majorityDates = Object.entries(results)
    .filter(([_, count]) => count >= majority);

  let bestDates = [];

  if (majorityDates.length > 0) {
    const max = Math.max(...majorityDates.map(([_, c]) => c));

    bestDates = majorityDates
      .filter(([_, c]) => c === max)
      .map(([d]) => d);
  }

  const noResult = bestDates.length === 0;

  /* ================== 날짜별 참여자 ================== */
  const getParticipants = (date) => {
    return Object.entries(votes)
      .filter(([_, u]) => u?.dates?.includes(date))
      .map(([name]) => name);
  };

  const participants = Object.keys(votes);

  return (
    <div className="app">

      {/* 헤더 */}
      <div className="header">
        <div className="room-title">{room.title}</div>

        <button className="share-btn" onClick={copyLink}>
          🔗
        </button>
      </div>

      {/* 중단 */}
      <div className="middle">

        {/* 참가자 */}
        <div className="participants-box">
          {participants.map((p, i) => (
            <div key={i} className="participant-row">
              <span>{p}</span>

              {isHost && (
                <button
                  className="kick-btn"
                  onClick={() => kickUser(p)}
                >
                  ❌
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 날짜 선택 */}
        <div className="dates-box">
          {room.dates.map((date, i) => {
            const d = String(date);

            const isMine = selected.includes(d);

            const isOthers = Object.entries(votes).some(
              ([name, u]) =>
                name !== user.name && u?.dates?.includes(d)
            );

            const names = getParticipants(d);

            return (
              <div key={i} className="date-item">

                <div
                  className={`
                    ${isMine ? "selected" : ""}
                    ${!isMine && isOthers ? "others-selected" : ""}
                  `}
                  onClick={() => toggle(d)}
                >
                  {d} {isMine && "✅"}
                </div>

                {/* 툴팁 */}
                {names.length > 0 && (
                  <div className="tooltip">
                    {names.join(", ")}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* 투표 버튼 */}
      <button className="vote-btn" onClick={submitVote}>
        투표하기
      </button>

      {/* 결과 */}
      <div className="result-box">

        {noResult && (
          <div className="no-result">
            아쉽게도 우리는 만날 수 없나봐요
          </div>
        )}

        {sorted.map(([date, count], i) => {
          const isBest = bestDates.includes(date);

          return (
            <div
              key={i}
              className={`result-item ${isBest ? "best" : ""}`}
            >
              {isBest && "⭐ "}
              {date} ({count}명)
            </div>
          );
        })}
      </div>
    </div>
  );
}