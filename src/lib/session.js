// reason: 방마다 로그인 정보를 따로 저장해서 여러 방에 동시에 참여할 수 있게 함
const SESSIONS_KEY = "sessions";
const LEGACY_KEY = "user";

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readSessions() {
  const parsed = readJson(SESSIONS_KEY);
  return parsed && typeof parsed === "object" ? parsed : {};
}

function writeSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // reason: 저장소를 쓸 수 없는 환경(시크릿 모드 등)에서는 저장만 건너뜀
  }
}

export function getSession(roomId) {
  if (!roomId) return null;

  const saved = readSessions()[roomId];
  if (saved?.name) return { id: roomId, name: saved.name };

  // reason: 이전 버전에서 "user" 키 하나에 저장한 로그인 정보도 계속 인정
  const legacy = readJson(LEGACY_KEY);
  if (legacy?.id === roomId && legacy.name) {
    return { id: roomId, name: legacy.name };
  }

  return null;
}

export function setSession({ id, name }) {
  const sessions = readSessions();
  sessions[id] = { name };
  writeSessions(sessions);
}

export function clearSession(roomId) {
  const sessions = readSessions();
  delete sessions[roomId];
  writeSessions(sessions);

  const legacy = readJson(LEGACY_KEY);
  if (legacy?.id === roomId) {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // ignore
    }
  }
}
