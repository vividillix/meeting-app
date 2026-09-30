import { createContext, useContext } from "react";

export const FeedbackContext = createContext(null);

/**
 * 화면 안 알림(토스트)과 확인창.
 * reason: 브라우저 기본 alert/confirm은 맨 위에 사이트 주소가 붙어서 보기 안 좋음
 *
 * const { toast, confirm } = useFeedback();
 * toast("저장됐어요");                       // 기본
 * toast("저장에 실패했어요", { type: "error" });
 * const ok = await confirm({ title, message, confirmText, danger: true });
 */
export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) {
    throw new Error("useFeedback은 FeedbackProvider 안에서만 쓸 수 있어요");
  }
  return value;
}
