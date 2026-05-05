import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";

export default function Room() {
  const { id } = useParams();
  const nav = useNavigate();

  const [room, setRoom] = useState(null);
  const [selected, setSelected] = useState([]);
  // const [openInfo, setOpenInfo] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));

  /* ================== 인증 체크 ================== */
  useEffect(() => {
    if (!user || user.id !== id) {
      alert("로그인 필요");
      nav(`/join/${id}`);
    }
  }, [user, id]);

  /* ================== 데이터 가져오기 ================== */
  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "rooms", id));
      setRoom(snap.data());
    };
    fetch();
  }, [id]);

  /* ================== 기존 선택 복원 ================== */
  useEffect(() => {
    if (room && user) {
      setSelected(room.votes?.[user.name] || []);
    }
  }, [room, user]);

  if (!room) return <div>loading...</div>;

  /* ================== 투표 로직 ================== */
  const toggle = (date) => {
    setSelected(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const submitVote = async () => {
    const newVotes = {
      ...room.votes,
      [user.name]: selected
    };

    await updateDoc(doc(db, "rooms", id), {
      votes: newVotes
    });

    setRoom(prev => ({ ...prev, votes: newVotes }));
    alert("저장 완료");
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/join/${id}`;
    await navigator.clipboard.writeText(url);
    alert("복사됨");
  };

  /* ================== 데이터 가공 ================== */

  const votes = room.votes || {};
  const participants = Object.keys(votes);

  // 날짜별 투표 수
  const results = {};
  Object.values(votes).forEach(arr => {
    arr.forEach(date => {
      results[date] = (results[date] || 0) + 1;
    });
  });

  // 정렬
  const sorted = Object.entries(results).sort((a, b) => {
    if (b[1] === a[1]) return a[0].localeCompare(b[0]);
    return b[1] - a[1];
  });

  // ⭐ 과반수 → 그 안에서 최다
  const participantsCount = participants.length;
  const majority = Math.floor(participantsCount / 2) + 1;

  const majorityEntries = sorted.filter(([_, c]) => c >= majority);

  let bestDates = [];
  if (majorityEntries.length > 0) {
    const max = majorityEntries[0][1];
    bestDates = majorityEntries
      .filter(([_, c]) => c === max)
      .map(([d]) => d);
  }

  const noResult = bestDates.length === 0;

  // 날짜별 참여자
  const getParticipantsByDate = (date) =>
    Object.entries(votes)
      .filter(([_, arr]) => arr.includes(date))
      .map(([name]) => name);

  /* ================== UI ================== */

  return (
    <div className="app">

      {/* 헤더 */}
      <div className="header">
        <div className="room-title">{room.title}</div>
        <div className="header-right">
          <span className="user">초대하기</span>
          <button className="share-btn" onClick={copyLink}>🔗</button>
        </div>
      </div>

      {/* 중단 */}
      <div className="middle">

        {/* 참가자 */}
        <div className="participants-box">
          {participants.map((p) => (
            <div key={p} className="participant">{p}</div>
          ))}
        </div>

        {/* 날짜 */}
        <div className="dates-box">
          {room.dates.map((date) => {
            const d = String(date);

            const isMine = selected.includes(d);

            const isOthers = Object.entries(votes).some(
              ([name, arr]) => name !== user.name && arr.includes(d)
            );

            const people = getParticipantsByDate(d);

            return (
              <div
                key={d}
                className={`
                  date-item
                  ${isMine ? "selected" : ""}
                  ${!isMine && isOthers ? "others-selected" : ""}
                `}
                onClick={() => toggle(d)}
              >
                {d} {isMine && "✅"}

                {/* 🔥 hover 툴팁 */}
                {people.length > 0 && (
                  <div className="tooltip">
                    {people.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 버튼 */}
      <button className="vote-btn" onClick={submitVote}>
        투표하기
      </button>

      {/* 결과 */}
      <div className="result-box">

        {sorted.length === 0 && <div>투표 없음</div>}

        {noResult && (
          <div className="no-result">
            아쉽게도 우리는 만날 수 없나봐요
          </div>
        )}

        {sorted.map(([date, count]) => {
          const isBest = bestDates.includes(date);

          return (
            <div
              key={date}
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