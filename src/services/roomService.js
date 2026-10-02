import { APP_ORIGIN } from "../constants/app";
import { ROOM_ERRORS, throwRoomError } from "../constants/roomErrors";
import { callApi } from "../lib/api";
import * as roomRepository from "../repositories/roomRepository";
import {
  assertCanJoinAsNew,
  finalDateOf,
  getMemberName,
  hasMember,
  isClosed,
  isValidRoomId,
  memberNames,
  roundDates,
  roundLabel,
  roundVotes,
  trimVotesToDates,
  validateCredentials,
  validateDateRange,
  validateRoomInput,
  validateRoomSettings,
  validateRoundTitle,
} from "../shared/roomRules";
import { generateDates, isValidDateStr } from "../utils/date";

export { finalDateOf, getMemberName, isClosed, memberNames, roundDates, roundLabel, roundVotes };

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

/**
 * 기간을 바꾸면 지워질 투표 미리보기 (확인창용)
 * 반환: { removedCount, affected: [닉네임] }
 */
export function previewRangeChange(room, start, end) {
  if (!isValidDateStr(start) || !isValidDateStr(end) || start > end) {
    return { removedCount: 0, affected: [] };
  }
  const { removedCount, affected } = trimVotesToDates(roundVotes(room), generateDates(start, end));
  return { removedCount, affected };
}

// 방장 전용: 방 제목·회차 제목·기간·최대 인원 수정. 입력은 여기서 먼저 검사하고 서버가 다시 확인
export async function updateRoomSettings({ roomId, room, title, roundTitle, start, end, maxPeople }) {
  const { cleanTitle, cleanRoundTitle } = validateRoomSettings(room, {
    title,
    roundTitle,
    start,
    end,
    maxPeople,
  });
  return callApi("rooms/update", {
    roomId,
    title: cleanTitle,
    roundTitle: cleanRoundTitle,
    start,
    end,
    maxPeople,
  });
}

// 방장 전용: 다음 회차 열기 (지금 회차를 확정한 뒤에만). 반환: { no }
export async function openNextRound({ roomId, start, end, title }) {
  validateDateRange(start, end);
  const cleanTitle = validateRoundTitle(title);
  return callApi("rooms/next", { roomId, start, end, title: cleanTitle });
}

// 방장 전용: 날짜 확정 → 투표 종료
export async function finalizeRoom({ roomId, date }) {
  return callApi("rooms/finalize", { roomId, date });
}

// 방장 전용: 확정 취소 → 다시 투표
export async function reopenRoom({ roomId }) {
  await callApi("rooms/reopen", { roomId });
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

// 공유·복사할 문구: "제목\n링크"
export function buildShareText({ roomId, title }) {
  const url = buildShareLink(roomId);
  const trimmedTitle = title?.trim();
  if (!trimmedTitle) return url;
  return `${trimmedTitle}\n${url}`;
}
