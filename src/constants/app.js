const DEFAULT_ORIGIN = "https://meeting-app-orpin.vercel.app";

export const APP_ORIGIN = (
  import.meta.env.VITE_APP_ORIGIN || DEFAULT_ORIGIN
).replace(/\/$/, "");
