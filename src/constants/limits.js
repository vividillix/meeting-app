// reason: 브라우저와 서버(api/)가 같이 쓰는 값 — import.meta.env 같은 Vite 전용 문법 금지

// 날짜가 너무 많으면 방 문서 크기와 투표 화면이 감당하지 못함
export const MAX_DATE_RANGE_DAYS = 90;
export const NICKNAME_MAX_LENGTH = 20;
export const TITLE_MAX_LENGTH = 100;
export const ROUND_TITLE_MAX_LENGTH = 30;
export const PASSWORD_MAX_LENGTH = 100;
export const MAX_PEOPLE = 100;

// 비밀번호를 연속으로 틀리면 잠시 잠금
export const LOGIN_MAX_FAILURES = 10;
export const LOGIN_LOCK_MINUTES = 10;

// 마지막 약속일(확정일)로부터 이 기간이 지나면 방이 자동 삭제됨 (Firestore TTL)
export const ROOM_RETENTION_MONTHS = 3;
