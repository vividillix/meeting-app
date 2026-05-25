import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";

export default function Home() {
  const nav = useNavigate();
  const [roomId, setRoomId] = useState("");

  const joinRoom = () => {
    const trimmed = roomId.trim();
    if (!trimmed) return;
    nav(ROUTES.join(trimmed));
  };

  return (
    <div className="container">
      <div className="title">약속 잡기</div>

      <button type="button" className="button" onClick={() => nav(ROUTES.CREATE)}>
        방 생성하기
      </button>

      <input
        className="input"
        placeholder="방 ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") joinRoom();
        }}
      />

      <button type="button" className="button" onClick={joinRoom}>
        입장하기
      </button>
    </div>
  );
}
