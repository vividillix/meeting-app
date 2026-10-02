/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import devApi from "./scripts/devApi.mjs";

// 서버 함수에서 쓰는 환경변수 (.env.local 등) — VITE_ 접두사가 없어 브라우저로는 안 나감
const SERVER_ENV_KEYS = ["FIREBASE_SERVICE_ACCOUNT", "GOOGLE_APPLICATION_CREDENTIALS"];

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  SERVER_ENV_KEYS.forEach((key) => {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  });

  return {
    plugins: [react(), devApi()],
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.js",
    },
  };
});
