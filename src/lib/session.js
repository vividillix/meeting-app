const SESSION_KEY = "user";

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession({ id, name }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id, name }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
