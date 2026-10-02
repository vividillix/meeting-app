export const ROUTES = {
  HOME: "/",
  CREATE: "/create",
  NOT_FOUND: "/not-found",
  join: (roomId) => `/join/${roomId}`,
  room: (roomId) => `/room/${roomId}`,
  roomSettings: (roomId) => `/room/${roomId}/settings`,
  nextRound: (roomId) => `/room/${roomId}/next`,
};
