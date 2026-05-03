import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";

export default function Room() {
  const { id } = useParams();
  const nav = useNavigate();

  const [room, setRoom] = useState(null);
  const [selected, setSelected] = useState([]);

  // 로그인 정보 (localStorage)
  const user = JSON.parse(localStorage.getItem("user"));

  // 로그인 안되어있으면 join으로 튕김
  useEffect(() => {
    if (!user || user.id !== id) {
      alert("로그인 필요");
      nav(`/join/${id}`);
    }
  }, []);

  // 방 데이터 가져오기
  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "rooms", id));
      setRoom(snap.data());
    };
    fetch();
  }, [id]);

  // 기존 투표 복원
  useEffect(() => {
    if (room && user) {
      setSelected(room.votes?.[user.name] || []);
    }
  }, [room]);

  if (!room) return <div>loading...</div>;

  // 날짜 선택
  const toggle = (date) => {
    setSelected(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  // 투표 저장
  const submitVote = async () => {
    const newVotes = {
      ...room.votes,
      [user.name]: selected
    };

    await updateDoc(doc(db, "rooms", id), {
      votes: newVotes
    });

    // 상태 즉시 반영 (새로고침 없이)
    setRoom(prev => ({
      ...prev,
      votes: newVotes
    }));

    alert("저장 완료");
  };

  // 링크 복사
  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/join/${id}`;
      await navigator.clipboard.writeText(url);
      alert("링크 복사됨!");
    } catch (e) {
      console.error(e);
      alert("복사 실패");
    }
  };

  // 집계
  const countVotes = () => {
    const result = {};

    Object.values(room.votes || {}).forEach(arr => {
      arr.forEach(date => {
        result[date] = (result[date] || 0) + 1;
      });
    });

    return result;
  };

  const results = countVotes();
  const sorted = Object.entries(results).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];

  return (
    <div className="container">
      <div className="title">{room.title}</div>

      <div style={{ marginBottom: 10 }}>
        <button
          className="button"
          style={{
            background: "#10b981",
            padding: "8px 12px",
            fontSize: 13
          }}
          onClick={copyLink}
        >
          🔗 링크 복사
        </button>
      </div>
      
      {/* 내 정보 */}
      <div style={{ marginBottom: 10 }}>
        👤 {user?.name}
      </div>

      {/* 날짜 선택 */}
      <div style={{ marginTop: 20 }}>
        {room.dates.map((date, i) => {
          const d = String(date);
          const isSelected = selected.includes(d);

          return (
            <div
              key={i}
              className={`date-item ${isSelected ? "selected" : ""}`}
              onClick={() => toggle(d)}
            >
              {d} {isSelected ? "✅" : ""}
            </div>
          );
        })}
      </div>

      <button className="button" onClick={submitVote}>
        투표하기
      </button>

      {/* 결과 */}
      <div style={{ marginTop: 30 }}>
        <div className="title">투표 결과</div>

        {Object.keys(results).length === 0 && (
          <div>아직 투표 없음</div>
        )}

        {Object.entries(results).map(([date, count], i) => (
          <div key={i} className="date-item">
            {date} : {count}명
          </div>
        ))}

        {best && (
          <div style={{ marginTop: 10, fontWeight: "bold" }}>
            ⭐ 최적 날짜: {best[0]} ({best[1]}명)
          </div>
        )}
      </div>
    </div>
  );
}