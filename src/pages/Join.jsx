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
    getDoc(doc(db, "rooms", id)).then(snap => {
      setRoom(snap.data());
    });
  }, [id]);

  if (!room) return <div>loading...</div>;

  const enter = async () => {
    // 기존 멤버
    if (mode === "existing") {
      if (!room.users[name]) return alert("없는 닉네임");
      if (room.users[name].password !== pw) return alert("비번 틀림");

      localStorage.setItem("user", JSON.stringify({ id, name }));
      nav(`/room/${id}`);
    }

    // 신규 멤버
    if (mode === "new") {
      if (room.users[name]) return alert("닉네임 중복");

      const newUsers = {
        ...room.users,
        [name]: { password: pw }
      };

      await updateDoc(doc(db, "rooms", id), {
        users: newUsers
      });

      localStorage.setItem("user", JSON.stringify({ id, name }));
      nav(`/room/${id}`);
    }
  };

    return (
    <div className="container">
        <div className="title">입장</div>

        {/* 1. 모드 선택 버튼 */}
        <div
        style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginBottom: 15
        }}
        >
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

        {/* 2. 안내 문구 */}
        <div style={{ marginBottom: 10, fontSize: 13, color: "#666" }}>
        {mode === "new"
            ? "새로 참여하는 멤버입니다"
            : "이미 참여한 멤버입니다"}
        </div>

        {/* 3. 입력 영역 */}
        <div>
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
        </div>

        {/* 4. 입장 버튼 */}
        <button className="button" onClick={enter}>
        입장
        </button>
    </div>
    );
}