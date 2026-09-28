import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CalendarIcon from "../components/CalendarIcon";
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
    <div className="page page--center">
      <div className="brand">
        <div className="brand__mark">
          <CalendarIcon />
        </div>
        <h1 className="brand__title">약속 잡기</h1>
        <p className="brand__desc">
          방을 만들고 링크를 보내면, 다 같이 되는 날을 한눈에 찾아드려요
        </p>
      </div>

      <section className="card form">
        <button type="button" className="btn btn--lg" onClick={() => nav(ROUTES.CREATE)}>
          새 약속 만들기
        </button>

        <div className="section-divider" />

        <div className="field">
          <label className="field__label" htmlFor="home-room-id">
            받은 방 ID로 들어가기
          </label>
          <div className="join-inline">
            <input
              id="home-room-id"
              className="input"
              placeholder="방 ID"
              autoCapitalize="off"
              autoCorrect="off"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") joinRoom();
              }}
            />
            <button
              type="button"
              className="btn btn--ghost"
              onClick={joinRoom}
              disabled={!roomId.trim()}
            >
              입장
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
