const DEFAULT_ORIGIN = "https://meeting-app-orpin.vercel.app";

export const APP_ORIGIN = (
  import.meta.env.VITE_APP_ORIGIN || DEFAULT_ORIGIN
).replace(/\/$/, "");

export {
  MAX_DATE_RANGE_DAYS,
  NICKNAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  MAX_PEOPLE,
} from "./limits.js";
