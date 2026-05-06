import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";

export default function Join() {
  const { id } = useParams();
  const nav = useNavigate();

  const [room, setRoom] = useState(null);
  const [mode, setMode] = useState("new"); // new / existing
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "rooms", id));

      if (!snap.exists()) {
        alert("존재하지 않는 방입니다");
        nav("/");
        return;
      }

      setRoom(snap.data());
    };

    fetch();
  }, [id]);

  if (!room) return <div>loading...</div>;

  const enter = async () => {
    if (!name.trim() || !pw) {
      alert("닉네임/비번 입력");
      return;
    }

    const snap = await getDoc(doc(db, "rooms", id));

    if (!snap.exists()) {
      alert("방 없음");
      return;
    }

    const room = snap.data();
      
    const cleanName = name.trim();
    const cleanPw = pw.trim();
    
    const userData = room.votes?.[cleanName];

    console.log(room)
    console.log(userData)

    if (mode === "existing") {

      if (!userData) {
        alert("존재하지 않는 사용자");
        return;
      }

      if (userData.password !== pw) {
        alert("비밀번호 틀림");
        return;
      }

      localStorage.setItem("user", JSON.stringify({ id, name }));
      nav(`/room/${id}`);
      return;
    }

    /* ================= 신규 유저 ================= */

    if (isExist) {
      alert("이미 존재하는 닉네임");
      return;
    }

    const currentCount = Object.keys(users).length;

    if (currentCount >= room.maxPeople) {
      alert("인원 가득");
      return;
    }

    // 🔥 첫 입장자 여부 판단
    const isFirstUser = !room.hostId; // null or undefined 체크

    await updateDoc(doc(db, "rooms", id), {
      [`votes.${cleanName}`]: {
        password: cleanPw,
        dates: []
      },
      ...(isFirstUser ? { hostId: cleanName } : {})
    });

    localStorage.setItem("user", JSON.stringify({
      id,
      name: cleanName
    }));
    nav(`/room/${id}`);
  };

  return (
    <div className="container">
      <div className="title">입장</div>

      {/* 모드 선택 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <button
          className="button"
          style={{
            width: 100,
            background: mode === "new" ? "#4f46e5" : "#ccc"
          }}
          onClick={() => setMode("new")}
        >
          신규
        </button>

        <button
          className="button"
          style={{
            width: 100,
            background: mode === "existing" ? "#4f46e5" : "#ccc"
          }}
          onClick={() => setMode("existing")}
        >
          기존
        </button>
      </div>

      {/* 안내 */}
      <div style={{ marginBottom: 10, fontSize: 13 }}>
        {mode === "new"
          ? "새로 참여하는 멤버입니다"
          : "이미 참여한 멤버입니다"}
      </div>

      {/* 입력 */}
      <input
        className="input"
        placeholder="닉네임"
        onChange={e => setName(e.target.value)}
      />

      <input
        className="input"
        type="password"
        placeholder="비밀번호"
        onChange={e => setPw(e.target.value)}
      />

      {/* 버튼 */}
      <button className="button" onClick={enter}>
        입장
      </button>
    </div>
  );
}