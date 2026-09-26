import { APP_ORIGIN } from "../constants/app";
import { ROOM_ERRORS, throwRoomError } from "../constants/roomErrors";
import { callApi } from "../lib/api";
import * as roomRepository from "../repositories/roomRepository";
import {
  assertCanJoinAsNew,
  getMemberName,
  hasMember,
  isValidRoomId,
  validateCredentials,
  validateRoomInput,
} from "../shared/roomRules";

export { getMemberName };

// 입력값은 여기서 먼저 검사해 빠르게 안내하고, 서버가 같은 규칙으로 다시 확인함
export async function createRoom({ title, start, end, maxPeople, name, password }) {
  const cleanTitle = validateRoomInput({ title, start, end, maxPeople });
  const { cleanName, cleanPw } = validateCredentials(name, password);

  const { roomId } = await callApi("rooms/create", {
    title: cleanTitle,
    start,
    end,
    maxPeople,
    name: cleanName,
    password: cleanPw,
  });

  return { roomId };
}

export async function getRoomForJoin(roomId) {
  if (!isValidRoomId(roomId)) {
    throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);
  }

  const { exists, data } = await roomRepository.fetchRoom(roomId);

  if (!exists) {
    throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);
  }

  return data;
}

/**
 * room(이미 불러온 방 정보)이 있으면 흔한 실패는 서버에 묻기 전에 안내.
 * 비밀번호 확인과 최종 판단은 서버가 함.
 */
export async function joinRoom({ roomId, mode, name, password, room }) {
  const { cleanName, cleanPw } = validateCredentials(name, password);

  if (room) {
    if (mode === "existing" && !hasMember(room, cleanName)) {
      throwRoomError(ROOM_ERRORS.USER_NOT_FOUND);
    }

    if (mode !== "existing") {
      assertCanJoinAsNew(room, cleanName);
    }
  }

  const result = await callApi("rooms/join", {
    roomId,
    mode: mode === "existing" ? "existing" : "new",
    name: cleanName,
    password: cleanPw,
  });

  return { id: roomId, name: result.name ?? cleanName };
}

export function subscribeRoom(roomId, onData, onMissing, onError) {
  return roomRepository.subscribeRoom(roomId, onData, onMissing, onError);
}

export async function saveVote({ roomId, nickname, dates }) {
  await roomRepository.setVoteDates(roomId, nickname, dates);
}

export async function kickParticipant({ roomId, target }) {
  await callApi("rooms/kick", { roomId, target });
}

// 방장이면 방이 삭제됨 → { deleted: true }
export async function leaveRoom({ roomId }) {
  const { deleted } = await callApi("rooms/leave", { roomId });
  return { deleted: !!deleted };
}

export function computeVoteSummary(votes = {}) {
  const results = {};

  Object.values(votes).forEach((user) => {
    if (!user || !Array.isArray(user.dates)) return;

    user.dates.forEach((date) => {
      results[date] = (results[date] || 0) + 1;
    });
  });

  const sorted = Object.entries(results).sort((a, b) => {
    if (b[1] === a[1]) return a[0].localeCompare(b[0]);
    return b[1] - a[1];
  });

  const total = Object.keys(votes).length;
  const majority = Math.floor(total / 2) + 1;

  const majorityDates = Object.entries(results).filter(
    ([, count]) => count >= majority
  );

  let bestDates = [];

  if (majorityDates.length > 0) {
    const max = Math.max(...majorityDates.map(([, count]) => count));
    bestDates = majorityDates
      .filter(([, count]) => count === max)
      .map(([date]) => date);
  }

  return {
    sorted,
    bestDates,
    noResult: bestDates.length === 0,
  };
}

export function getParticipantsForDate(votes = {}, date) {
  return Object.entries(votes)
    .filter(([, user]) => user?.dates?.includes(date))
    .map(([name]) => name);
}

export function buildShareLink(roomId) {
  return `${APP_ORIGIN}/join/${roomId}`;
}

export function buildShareText({ roomId, title }) {
  const url = buildShareLink(roomId);
  const trimmedTitle = title?.trim();
  if (!trimmedTitle) return url;
  return `${trimmedTitle} ${url}`;
}
