import { useNavigate } from "react-router-dom";

export default function Home() {
  const nav = useNavigate();

  return (
    <div className="container">
      <div className="title">약속 잡기</div>

      <button className="button" onClick={() => nav("/create")}>
        방 생성하기
      </button>

      <button
        className="button"
        style={{ marginTop: 10 }}
        onClick={() => {
          const id = prompt("방 ID 입력");
          if (id) nav(`/join/${id}`);
        }}
      >
        입장하기
      </button>
    </div>
  );
}