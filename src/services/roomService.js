import { APP_ORIGIN, MAX_DATE_RANGE_DAYS, NICKNAME_MAX_LENGTH } from "../constants/app";
import { ROOM_ERRORS, ROOM_ERROR_MESSAGES } from "../constants/roomErrors";
import * as roomRepository from "../repositories/roomRepository";
import { countDays, generateDates, isValidDateStr } from "../utils/date";

const CREATE_ROOM_MAX_ATTEMPTS = 3;

function throwRoomError(code, message = ROOM_ERROR_MESSAGES[code]) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

export function validateCredentials(name, password) {
  const cleanName = (name ?? "").trim();
  const cleanPw = (password ?? "").trim();

  if (!cleanName || !cleanPw) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "닉네임과 비밀번호를 입력해 주세요");
  }

  if (cleanName.length > NICKNAME_MAX_LENGTH) {
    throwRoomError(
      ROOM_ERRORS.VALIDATION,
      `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요`
    );
  }

  // reason: Firestore는 "__이름__" 형태의 필드명을 예약어로 막아둠
  if (/^__.*__$/.test(cleanName)) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "사용할 수 없는 닉네임이에요");
  }

  return { cleanName, cleanPw };
}

function validateRoomInput({ title, start, end, maxPeople }) {
  const cleanTitle = (title ?? "").trim();

  if (!cleanTitle) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "제목을 입력해 주세요");
  }

  if (!Number.isInteger(maxPeople) || maxPeople < 1) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "최대 인원은 1명 이상이어야 해요");
  }

  if (!isValidDateStr(start) || !isValidDateStr(end)) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "시작일과 종료일을 선택해 주세요");
  }

  const days = countDays(start, end);

  if (days < 1) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "종료일이 시작일보다 빨라요");
  }

  if (days > MAX_DATE_RANGE_DAYS) {
    throwRoomError(
      ROOM_ERRORS.VALIDATION,
      `날짜 범위는 최대 ${MAX_DATE_RANGE_DAYS}일까지 선택할 수 있어요`
    );
  }

  return cleanTitle;
}

/**
 * 방을 만들고 만든 사람을 방장으로 바로 등록함.
 * reason: 예전에는 "처음 입장한 사람"이 방장이 돼서, 링크를 먼저 받은 다른 사람이
 * 방장이 될 수 있었음
 */
export async function createRoom({ title, start, end, maxPeople, name, password }) {
  const cleanTitle = validateRoomInput({ title, start, end, maxPeople });
  const { cleanName, cleanPw } = validateCredentials(name, password);

  const data = {
    title: cleanTitle,
    dates: generateDates(start, end),
    maxPeople,
    hostId: cleanName,
    votes: {
      [cleanName]: { password: cleanPw, dates: [] },
    },
  };

  // reason: 같은 밀리초에 방이 두 개 만들어지면 기존 방을 덮어쓰던 문제 방지
  for (let attempt = 0; attempt < CREATE_ROOM_MAX_ATTEMPTS; attempt += 1) {
    const roomId = (Date.now() + attempt).toString();
    const created = await roomRepository.createRoomIfAbsent(roomId, data);

    if (created) {
      return { roomId, session: { id: roomId, name: cleanName } };
    }
  }

  throwRoomError(ROOM_ERRORS.ROOM_ID_CONFLICT);
}

export async function getRoomForJoin(roomId) {
  const { exists, data } = await roomRepository.fetchRoom(roomId);

  if (!exists) {
    throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);
  }

  return data;
}

function assertCanJoinAsNew(room, cleanName) {
  const votes = room.votes || {};

  if (Object.prototype.hasOwnProperty.call(votes, cleanName)) {
    throwRoomError(ROOM_ERRORS.DUPLICATE_NAME);
  }

  if (Object.keys(votes).length >= room.maxPeople) {
    throwRoomError(ROOM_ERRORS.ROOM_FULL);
  }
}

export async function joinRoom({ roomId, mode, name, password }) {
  const { cleanName, cleanPw } = validateCredentials(name, password);
  const { exists, data: room } = await roomRepository.fetchRoom(roomId);

  if (!exists) {
    throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);
  }

  if (mode === "existing") {
    const votes = room.votes || {};
    const userData = Object.prototype.hasOwnProperty.call(votes, cleanName)
      ? votes[cleanName]
      : null;

    if (!userData) {
      throwRoomError(ROOM_ERRORS.USER_NOT_FOUND);
    }

    if (userData.password !== cleanPw) {
      throwRoomError(ROOM_ERRORS.WRONG_PASSWORD);
    }

    return { id: roomId, name: cleanName };
  }

  // reason: 트랜잭션 전에 한 번 검사해서 흔한 실패는 빠르게 안내
  assertCanJoinAsNew(room, cleanName);

  // reason: 읽기와 쓰기를 트랜잭션으로 묶어서, 동시에 입장해도
  // 닉네임 중복·인원 초과·방장 덮어쓰기가 생기지 않게 함
  await roomRepository.runRoomTransaction(roomId, ({ exists: stillExists, data }) => {
    if (!stillExists) {
      throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND);
    }

    assertCanJoinAsNew(data, cleanName);

    const updates = [[["votes", cleanName], { password: cleanPw, dates: [] }]];

    // 방장 없이 만들어진 예전 방은 첫 입장자가 방장이 됨
    if (!data.hostId) {
      updates.push([["hostId"], cleanName]);
    }

    return { updates };
  });

  return { id: roomId, name: cleanName };
}

export function assertRoomMember(session, roomId) {
  if (!session || session.id !== roomId) {
    throwRoomError(ROOM_ERRORS.NOT_MEMBER);
  }
}

export function subscribeRoom(roomId, onData, onMissing, onError) {
  return roomRepository.subscribeRoom(roomId, onData, onMissing, onError);
}

export async function saveVote({ roomId, nickname, dates }) {
  await roomRepository.setVoteDates(roomId, nickname, dates);
}

export async function kickParticipant({ roomId, hostNickname, target, room }) {
  if (hostNickname !== room.hostId) {
    throwRoomError(ROOM_ERRORS.NOT_HOST);
  }

  await roomRepository.removeVoteField(roomId, target);
}

export async function leaveRoom({ roomId, nickname, isHost }) {
  if (isHost) {
    await roomRepository.deleteRoom(roomId);
    return { deleted: true };
  }

  await roomRepository.removeVoteField(roomId, nickname);
  return { deleted: false };
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
