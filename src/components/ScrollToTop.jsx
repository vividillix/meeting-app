import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// reason: 다른 화면에서 스크롤한 위치가 남아 투표 화면 중간부터 보이는 문제 방지
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
