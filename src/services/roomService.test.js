import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROOM_ERRORS } from "../constants/roomErrors";
import { callApi } from "../lib/api";
import { generateDates } from "../utils/date";
import * as roomService from "./roomService";

vi.mock("../lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("../repositories/roomRepository");
vi.mock("../lib/api", () => ({ callApi: vi.fn() }));

const baseRoom = () => ({
  title: "모임",
  maxPeople: 2,
  hostId: "alice",
  dates: ["2026-10-01"],
  votes: { alice: { dates: [] } },
  memberUids: { u1: "alice" },
});

async function expectRoomError(promise, code) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("createRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callApi.mockResolvedValue({ roomId: "abc123xyz9" });
  });

  const valid = {
    title: " 모임 ",
    start: "2026-10-01",
    end: "2026-10-03",
    maxPeople: 4,
    name: " alice ",
    password: " pw ",
  };

  it("정리된 값으로 서버에 방 생성을 요청한다", async () => {
    const { roomId } = await roomService.createRoom(valid);

    expect(roomId).toBe("abc123xyz9");
    expect(callApi).toHaveBeenCalledWith("rooms/create", {
      title: "모임",
      start: "2026-10-01",
      end: "2026-10-03",
      maxPeople: 4,
      name: "alice",
      password: "pw",
    });
  });

  it.each([
    ["공백 제목", { title: "   " }],
    ["공백 비밀번호", { password: "   " }],
    ["종료일이 시작일보다 빠름", { start: "2026-10-05", end: "2026-10-01" }],
    ["기간 초과", { start: "2026-01-01", end: "2026-12-31" }],
    ["최대 인원 0", { maxPeople: 0 }],
    ["최대 인원 초과", { maxPeople: 1000 }],
    ["예약된 닉네임", { name: "__proto__" }],
  ])("%s이면 서버에 요청하지 않는다", async (_, override) => {
    await expectRoomError(
      roomService.createRoom({ ...valid, ...override }),
      ROOM_ERRORS.VALIDATION
    );
    expect(callApi).not.toHaveBeenCalled();
  });
});

describe("joinRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callApi.mockResolvedValue({ name: "bob" });
  });

  it("인원이 찬 방은 서버에 묻기 전에 안내한다", async () => {
    const room = { ...baseRoom(), votes: { alice: {}, carol: {} } };

    await expectRoomError(
      roomService.joinRoom({ roomId: "r1", mode: "new", name: "bob", password: "pw", room }),
      ROOM_ERRORS.ROOM_FULL
    );
    expect(callApi).not.toHaveBeenCalled();
  });

  it("최종 판단은 서버에 맡긴다", async () => {
    const result = await roomService.joinRoom({
      roomId: "r1",
      mode: "new",
      name: " bob ",
      password: "pw",
      room: baseRoom(),
    });

    expect(result).toEqual({ id: "r1", name: "bob" });
    expect(callApi).toHaveBeenCalledWith("rooms/join", {
      roomId: "r1",
      mode: "new",
      name: "bob",
      password: "pw",
    });
  });
});

describe("getMemberName", () => {
  it("uid에 연결된 닉네임을 돌려주고, 강퇴된 이름이면 null", () => {
    const room = baseRoom();
    expect(roomService.getMemberName(room, "u1")).toBe("alice");
    expect(roomService.getMemberName(room, "u2")).toBeNull();
    expect(
      roomService.getMemberName({ ...room, votes: {} }, "u1")
    ).toBeNull();
  });
});

describe("getRoomForJoin", () => {
  it("형식이 잘못된 방 ID는 없는 방으로 처리한다", async () => {
    await expectRoomError(roomService.getRoomForJoin("a/b"), ROOM_ERRORS.ROOM_NOT_FOUND);
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

describe("buildShareText", () => {
  it("제목과 링크를 한 문구에 함께 담는다", () => {
    const text = roomService.buildShareText({ roomId: "abc123xyz9", title: " 10월 모임 " });
    expect(text).toMatch(/^10월 모임\n/);
    expect(text).toMatch(/\/join\/abc123xyz9$/);
  });

  it("제목이 없으면 링크만 담는다", () => {
    expect(roomService.buildShareText({ roomId: "abc123xyz9", title: "" })).toMatch(
      /^https?:\/\/\S+\/join\/abc123xyz9$/
    );
  });
});
