import { useNavigate } from "react-router-dom";
import CalendarIcon from "../components/CalendarIcon";
import { ROUTES } from "../constants/routes";

export default function NotFound() {
  const nav = useNavigate();

  return (
    <div className="page page--center">
      <section className="card empty-state">
        <div className="brand__mark" style={{ margin: "0 auto var(--space-md)" }}>
          <CalendarIcon />
        </div>
        <h1 className="empty-state__title">방을 찾을 수 없어요</h1>
        <p className="empty-state__desc">
          존재하지 않거나 삭제된 방입니다. 방 ID를 다시 확인해 주세요.
        </p>
        <button type="button" className="btn" onClick={() => nav(ROUTES.HOME)}>
          홈으로
        </button>
      </section>
    </div>
  );
}
