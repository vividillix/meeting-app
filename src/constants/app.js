const DEFAULT_ORIGIN = "https://meeting-app-orpin.vercel.app";

export const APP_ORIGIN = (
  import.meta.env.VITE_APP_ORIGIN || DEFAULT_ORIGIN
).replace(/\/$/, "");

// reason: 날짜가 너무 많으면 방 문서 크기와 투표 화면이 감당하지 못함
export const MAX_DATE_RANGE_DAYS = 90;
export const NICKNAME_MAX_LENGTH = 20;
