import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";

export default function NotFound() {
  const nav = useNavigate();

  return (
    <div className="container">
      <div className="title">방을 찾을 수 없어요</div>
      <p className="not-found-message">
        존재하지 않거나 삭제된 방입니다. 방 ID를 다시 확인해 주세요.
      </p>

      <button type="button" className="button" onClick={() => nav(ROUTES.HOME)}>
        홈으로
      </button>
    </div>
  );
}
