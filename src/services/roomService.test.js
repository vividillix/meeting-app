import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROOM_ERRORS } from "../constants/roomErrors";
import * as roomRepository from "../repositories/roomRepository";
import { generateDates } from "../utils/date";
import * as roomService from "./roomService";

vi.mock("../repositories/roomRepository");

const baseRoom = () => ({
  title: "모임",
  maxPeople: 3,
  hostId: "alice",
  dates: ["2026-10-01"],
  votes: { alice: { password: "1234", dates: [] } },
});

// 트랜잭션 mock: decide를 현재 방 데이터로 실행하고 updates를 돌려받음
function mockTransaction(room) {
  const calls = [];
  roomRepository.runRoomTransaction.mockImplementation(async (roomId, decide) => {
    const { updates = [], result } =
      decide({ exists: !!room, data: room }) ?? {};
    calls.push(updates);
    return result;
  });
  return calls;
}

async function expectRoomError(promise, code) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("createRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roomRepository.createRoomIfAbsent.mockResolvedValue(true);
  });

  const valid = {
    title: " 모임 ",
    start: "2026-10-01",
    end: "2026-10-03",
    maxPeople: 4,
    name: " alice ",
    password: " pw ",
  };

  it("만든 사람을 방장·첫 참가자로 등록한다", async () => {
    const { roomId, session } = await roomService.createRoom(valid);

    expect(session).toEqual({ id: roomId, name: "alice" });
    expect(roomRepository.createRoomIfAbsent).toHaveBeenCalledWith(roomId, {
      title: "모임",
      dates: ["2026-10-01", "2026-10-02", "2026-10-03"],
      maxPeople: 4,
      hostId: "alice",
      votes: { alice: { password: "pw", dates: [] } },
    });
  });

  it("ID가 겹치면 다른 ID로 다시 시도한다", async () => {
    roomRepository.createRoomIfAbsent
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await roomService.createRoom(valid);

    const [first, second] = roomRepository.createRoomIfAbsent.mock.calls;
    expect(first[0]).not.toBe(second[0]);
  });

  it.each([
    ["공백 제목", { title: "   " }],
    ["공백 비밀번호", { password: "   " }],
    ["종료일이 시작일보다 빠름", { start: "2026-10-05", end: "2026-10-01" }],
    ["기간 초과", { start: "2026-01-01", end: "2026-12-31" }],
    ["최대 인원 0", { maxPeople: 0 }],
    ["예약된 닉네임", { name: "__proto__" }],
  ])("%s이면 생성하지 않는다", async (_, override) => {
    await expectRoomError(
      roomService.createRoom({ ...valid, ...override }),
      ROOM_ERRORS.VALIDATION
    );
    expect(roomRepository.createRoomIfAbsent).not.toHaveBeenCalled();
  });
});

describe("joinRoom (신규)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("닉네임에 점이 있어도 경로 조각으로 저장한다", async () => {
    const room = baseRoom();
    roomRepository.fetchRoom.mockResolvedValue({ exists: true, data: room });
    const calls = mockTransaction(room);

    await roomService.joinRoom({
      roomId: "r1",
      mode: "new",
      name: "a.b",
      password: "pw",
    });

    expect(calls[0]).toEqual([[["votes", "a.b"], { password: "pw", dates: [] }]]);
  });

  it("트랜잭션 시점에 인원이 찼으면 입장하지 않는다", async () => {
    const before = baseRoom();
    const now = {
      ...baseRoom(),
      votes: { ...before.votes, bob: {}, carol: {} },
    };
    roomRepository.fetchRoom.mockResolvedValue({ exists: true, data: before });
    mockTransaction(now);

    await expectRoomError(
      roomService.joinRoom({ roomId: "r1", mode: "new", name: "dave", password: "pw" }),
      ROOM_ERRORS.ROOM_FULL
    );
  });

  it("트랜잭션 시점에 같은 닉네임이 생겼으면 입장하지 않는다", async () => {
    roomRepository.fetchRoom.mockResolvedValue({ exists: true, data: baseRoom() });
    mockTransaction({ ...baseRoom(), votes: { ...baseRoom().votes, bob: {} } });

    await expectRoomError(
      roomService.joinRoom({ roomId: "r1", mode: "new", name: "bob", password: "pw" }),
      ROOM_ERRORS.DUPLICATE_NAME
    );
  });

  it("방장이 있는 방에서는 hostId를 바꾸지 않는다", async () => {
    const room = baseRoom();
    roomRepository.fetchRoom.mockResolvedValue({ exists: true, data: room });
    const calls = mockTransaction(room);

    await roomService.joinRoom({ roomId: "r1", mode: "new", name: "bob", password: "pw" });

    expect(calls[0].some(([path]) => path[0] === "hostId")).toBe(false);
  });

  it("방장 없이 만들어진 예전 방은 첫 입장자가 방장이 된다", async () => {
    const room = { ...baseRoom(), hostId: null, votes: {} };
    roomRepository.fetchRoom.mockResolvedValue({ exists: true, data: room });
    const calls = mockTransaction(room);

    await roomService.joinRoom({ roomId: "r1", mode: "new", name: "bob", password: "pw" });

    expect(calls[0]).toContainEqual([["hostId"], "bob"]);
  });

  it("공백 비밀번호는 거부한다", async () => {
    await expectRoomError(
      roomService.joinRoom({ roomId: "r1", mode: "new", name: "bob", password: "  " }),
      ROOM_ERRORS.VALIDATION
    );
    expect(roomRepository.fetchRoom).not.toHaveBeenCalled();
  });
});

describe("generateDates", () => {
  it("월·연도 경계를 넘어도 하루씩 빠짐없이 만든다", () => {
    expect(generateDates("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
});

describe("computeVoteSummary", () => {
  it("과반이 고른 날짜 중 최다 득표일을 추천한다", () => {
    const summary = roomService.computeVoteSummary({
      a: { dates: ["2026-10-01", "2026-10-02"] },
      b: { dates: ["2026-10-01"] },
      c: { dates: ["2026-10-02", "2026-10-01"] },
    });

    expect(summary.bestDates).toEqual(["2026-10-01"]);
    expect(summary.noResult).toBe(false);
  });
});
