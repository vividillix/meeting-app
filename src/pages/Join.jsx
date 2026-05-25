import { useJoinRoom } from "../features/room/useJoinRoom";

export default function Join() {
  const {
    room,
    loading,
    mode,
    setMode,
    name,
    setName,
    password,
    setPassword,
    submitting,
    enter,
  } = useJoinRoom();

  if (loading || !room) return <div className="loading">loading...</div>;

  return (
    <div className="container">
      <div className="title">입장</div>

      <div className="mode-toggle">
        <button
          type="button"
          className={`button ${mode !== "new" ? "button--inactive" : ""}`}
          onClick={() => setMode("new")}
        >
          신규
        </button>

        <button
          type="button"
          className={`button ${mode !== "existing" ? "button--inactive" : ""}`}
          onClick={() => setMode("existing")}
        >
          기존
        </button>
      </div>

      <div className="mode-hint">
        {mode === "new"
          ? "새로 참여하는 멤버입니다"
          : "이미 참여한 멤버입니다"}
      </div>

      <input
        className="input"
        placeholder="닉네임"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="input"
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="button" onClick={enter} disabled={submitting}>
        입장
      </button>
    </div>
  );
}
