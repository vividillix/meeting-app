// 방마다 쓰는 간단한 암호 입력칸.
// reason: type="password"를 쓰면 크롬이 로그인 비밀번호로 인식해서
// "비밀번호 유출" 경고와 "저장할까요?" 창을 띄움 → 일반 글자 칸에 ●● 가림 처리만 함
const SUPPORTS_TEXT_SECURITY =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("-webkit-text-security", "disc");

export default function SecretInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      // 가림 처리를 지원하지 않는 브라우저에서는 글자가 그대로 보이지 않게 기존 방식으로
      type={SUPPORTS_TEXT_SECURITY ? "text" : "password"}
      className={`${className} input--secret`}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-1p-ignore="true"
      data-lpignore="true"
      data-form-type="other"
    />
  );
}
