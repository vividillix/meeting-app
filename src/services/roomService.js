import { ROOM_ERRORS } from "../constants/roomErrors";
import * as roomRepository from "../repositories/roomRepository";
import { generateDates } from "../utils/date";

function throwRoomError(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

export async function createRoom({ title, start, end, maxPeople }) {
  if (!title || !start || !end || !maxPeople) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "값 입력");
  }

  if (maxPeople <= 0) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "값 입력");
  }

  if (new Date(start) > new Date(end)) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "값 입력");
  }

  const roomId = Date.now().toString();
  const dates = generateDates(start, end);

  await roomRepository.createRoom(roomId, {
    title,
    dates,
    maxPeople,
    votes: {},
    hostId: null,
  });

  return roomId;
}

export async function getRoomForJoin(roomId) {
  const { exists, data } = await roomRepository.fetchRoom(roomId);

  if (!exists) {
    throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND, "존재하지 않는 방입니다");
  }

  return data;
}

export async function joinRoom({ roomId, mode, name, password }) {
  const { exists, data: room } = await roomRepository.fetchRoom(roomId);
  const cleanName = name.trim();
  const cleanPw = password.trim();

  if (!cleanName || !password) {
    throwRoomError(ROOM_ERRORS.VALIDATION, "닉네임/비번 입력");
  }

  if (!exists) {
    throwRoomError(ROOM_ERRORS.ROOM_NOT_FOUND, "방 없음");
  }

  const userData = room.votes?.[cleanName];

  if (mode === "existing") {
    if (!userData) {
      throwRoomError(ROOM_ERRORS.USER_NOT_FOUND, "존재하지 않는 사용자");
    }

    if (userData.password !== cleanPw) {
      throwRoomError(ROOM_ERRORS.WRONG_PASSWORD, "비밀번호 틀림");
    }

    return { id: roomId, name: cleanName };
  }

  if (userData) {
    throwRoomError(ROOM_ERRORS.DUPLICATE_NAME, "이미 존재하는 닉네임");
  }

  const currentCount = Object.keys(room.votes || {}).length;

  if (currentCount >= room.maxPeople) {
    throwRoomError(ROOM_ERRORS.ROOM_FULL, "인원 가득");
  }

  const isFirstUser = !room.hostId;

  await roomRepository.updateRoom(roomId, {
    [`votes.${cleanName}`]: {
      password: cleanPw,
      dates: [],
    },
    ...(isFirstUser ? { hostId: cleanName } : {}),
  });

  return { id: roomId, name: cleanName };
}

export function assertRoomMember(session, roomId) {
  if (!session || session.id !== roomId) {
    throwRoomError(ROOM_ERRORS.NOT_MEMBER, "로그인 필요");
  }
}

export function subscribeRoom(roomId, onData, onMissing) {
  return roomRepository.subscribeRoom(roomId, onData, onMissing);
}

export async function saveVote({ roomId, nickname, dates }) {
  await roomRepository.updateRoom(roomId, {
    [`votes.${nickname}.dates`]: dates,
  });
}

export async function kickParticipant({ roomId, hostNickname, target, room }) {
  if (hostNickname !== room.hostId) {
    throwRoomError(ROOM_ERRORS.NOT_HOST, "방장만 가능합니다");
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

export function getParticipantsForDate(votes, date) {
  return Object.entries(votes)
    .filter(([, user]) => user?.dates?.includes(date))
    .map(([name]) => name);
}

export function buildShareLink(roomId) {
  return `${window.location.origin}/join/${roomId}`;
}
