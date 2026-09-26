/// <reference types="vitest/config" />
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// 서버 함수에서 쓰는 환경변수 (.env.local 등) — VITE_ 접두사가 없어 브라우저로는 안 나감
const SERVER_ENV_KEYS = ["FIREBASE_SERVICE_ACCOUNT", "GOOGLE_APPLICATION_CREDENTIALS"];

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// reason: `npm run dev`에서도 Vercel 서버 함수(api/*.js)를 그대로 실행 — 배포 환경과 같은 코드
function devApi() {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || "").split("?")[0];
        const match = pathname.match(/^\/api\/([a-z]+(?:\/[a-z]+)*)$/);
        if (!match) return next();

        const file = path.resolve(server.config.root, "api", `${match[1]}.js`);
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (data) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
          return res;
        };

        if (!existsSync(file)) {
          return res.status(404).json({ code: "NOT_FOUND", message: "없는 API" });
        }

        try {
          req.body = await readJsonBody(req);
          const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
          await mod.default(req, res);
        } catch (error) {
          server.config.logger.error(`[dev-api] ${error?.stack || error}`);
          if (!res.headersSent) {
            res.status(500).json({ code: "INTERNAL", message: "서버 오류가 발생했어요" });
          }
        }
      });
    },
  };
}

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
