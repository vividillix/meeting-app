// `npm run dev`에서 Vercel 서버 함수(api/*.js)를 실행하는 Vite 플러그인.
// reason: Node는 한 번 불러온 모듈을 계속 기억해서, 서버 코드를 고쳐도 개발 서버를 껐다 켜기 전엔
// 예전 코드가 돌았음 → 요청마다 새 워커 스레드에서 실행해 항상 최신 코드를 씀 (개발용이라 속도는 괜찮음)
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

const WORKER_SOURCE = `
const { parentPort, workerData } = require("node:worker_threads");
(async () => {
  let statusCode = 200;
  const headers = {};
  let body = "";
  const res = {
    status(code) { statusCode = code; return res; },
    setHeader(key, value) { headers[key] = value; },
    json(data) { headers["Content-Type"] = "application/json"; body = JSON.stringify(data); return res; },
    end(text) { if (text !== undefined) body = String(text); return res; },
  };
  try {
    const mod = await import(workerData.fileUrl);
    await mod.default(workerData.req, res);
    parentPort.postMessage({ ok: true, statusCode, headers, body });
  } catch (error) {
    parentPort.postMessage({ ok: false, error: (error && error.stack) || String(error) });
  }
})();
`;

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

// 서버 함수 파일 하나를 새 워커에서 실행하고 { statusCode, headers, body }를 돌려줌
export function runApiFile(file, request) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_SOURCE, {
      eval: true,
      env: process.env,
      workerData: { fileUrl: pathToFileURL(file).href, req: request },
    });
    worker.once("message", (result) => {
      worker.terminate();
      if (result.ok) resolve(result);
      else reject(new Error(result.error));
    });
    worker.once("error", reject);
  });
}

export function resolveApiFile(root, url = "") {
  const pathname = url.split("?")[0];
  const match = pathname.match(/^\/api\/([a-z]+(?:\/[a-z]+)*)$/);
  if (!match) return null;
  return path.resolve(root, "api", `${match[1]}.js`);
}

export default function devApi() {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const file = resolveApiFile(server.config.root, req.url);
        if (!file) return next();

        const send = (statusCode, headers, body) => {
          res.statusCode = statusCode;
          Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
          res.end(body);
        };

        if (!existsSync(file)) {
          return send(404, { "Content-Type": "application/json" }, JSON.stringify({ code: "NOT_FOUND", message: "없는 API" }));
        }

        try {
          const body = await readJsonBody(req);
          const result = await runApiFile(file, { method: req.method, headers: req.headers, body });
          send(result.statusCode, result.headers, result.body);
        } catch (error) {
          server.config.logger.error(`[dev-api] ${req.url} 실행 실패\n${error?.stack || error}`);
          send(500, { "Content-Type": "application/json" }, JSON.stringify({ code: "INTERNAL", message: "서버 오류가 발생했어요" }));
        }
      });
    },
  };
}
