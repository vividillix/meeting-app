// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ROOM_ERRORS } from "../../src/constants/roomErrors.js";
import { LOGIN_MAX_FAILURES } from "../../src/constants/limits.js";
import { toRoundShape } from "../../src/shared/roomRules.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  DELETE,
  buildNewRoom,
  expireAtFor,
  failureState,
  generateRoomId,
  isLocked,
  planFinalize,
  planJoinNew,
  planKick,
  planLeave,
  planLogin,
  planOpenNextRound,
  planReopen,
  planUpdateRoom,
} from "./roomPlans.js";

function expectCode(fn, code) {
  let caught;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught?.code).toBe(code);
}

const NOW = new Date("2026-10-01T00:00:00Z");
const kst = (d) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 16);

const room = () => ({
  title: "모임",
  maxPeople: 3,
  hostId: "host",
  memberUids: { uHost: "host", uAb1: "a.b", uAb2: "a.b" },
  members: { host: { joinedAt: NOW }, "a.b": { joinedAt: NOW } },
  round: {
    no: 1,
    title: null,
    dates: ["2026-10-01", "2026-10-02", "2026-10-03"],
    votes: {
      host: { dates: ["2026-10-01", "2026-10-03"] },
      "a.b": { dates: ["2026-10-02"] },
    },
    status: "open",
  },
  history: [],
});

const closedRoom = () => {
  const r = room();
  r.round.status = "closed";
  r.round.finalDate = "2026-10-02";
  return r;
};

describe("password", () => {
  it("해시로 저장하고 같은 비밀번호만 통과시킨다", async () => {
    const stored = await hashPassword("1234");
    expect(stored).not.toContain("1234");
    expect(await verifyPassword("1234", stored)).toBe(true);
    expect(await verifyPassword("1235", stored)).toBe(false);
    expect(await verifyPassword("1234", "plain-text")).toBe(false);
  });
});

describe("generateRoomId", () => {
  it("추측하기 어려운 10자리 ID를 만든다", () => {
    const ids = new Set(Array.from({ length: 1000 }, generateRoomId));
    expect(ids.size).toBe(1000);
    ids.forEach((id) => expect(id).toMatch(/^[23456789a-hjkmnp-z]{10}$/));
  });
});

describe("buildNewRoom", () => {
  it("만든 사람을 방장·첫 참가자로 하고 1회차를 연다", () => {
    const r = buildNewRoom({
      title: "모임",
      start: "2026-10-01",
      end: "2026-10-02",
      maxPeople: 4,
      name: "host",
      uid: "uHost",
      now: NOW,
    });
    expect(r.members).toEqual({ host: { joinedAt: NOW } });
    expect(r.round).toEqual({
      no: 1,
      title: null,
      dates: ["2026-10-01", "2026-10-02"],
      votes: { host: { dates: [] } },
      status: "open",
    });
    expect(r.history).toEqual([]);
    expect(kst(r.expireAt)).toBe("2027-01-03T00:00");
  });
});

describe("planJoinNew", () => {
  it("참가자 명단·이번 회차 투표 칸·이 기기 uid를 함께 등록한다", () => {
    expect(planJoinNew({ room: room(), name: "c", uid: "uC", now: NOW })).toEqual({
      members: { c: { joinedAt: NOW } },
      round: { votes: { c: { dates: [] } } },
      memberUids: { uC: "c" },
    });
  });

  it("중복 닉네임·인원 초과를 막는다", () => {
    expectCode(() => planJoinNew({ room: room(), name: "a.b", uid: "x" }), ROOM_ERRORS.DUPLICATE_NAME);
    const full = { ...room(), maxPeople: 2 };
    expectCode(() => planJoinNew({ room: full, name: "c", uid: "x" }), ROOM_ERRORS.ROOM_FULL);
  });

  it("방장 없는 예전 방은 첫 입장자가 방장이 된다", () => {
    const legacy = { ...room(), hostId: null, members: {}, memberUids: {} };
    expect(planJoinNew({ room: legacy, name: "c", uid: "uC" }).hostId).toBe("c");
  });
});

describe("planLogin / 잠금", () => {
  it("없는 닉네임은 거부한다", () => {
    expectCode(() => planLogin({ room: room(), name: "zz", uid: "x" }), ROOM_ERRORS.USER_NOT_FOUND);
  });

  it("투표 칸이 없는 참가자는 칸을 만들어 준다", () => {
    const r = room();
    delete r.round.votes["a.b"];
    expect(planLogin({ room: r, name: "a.b", uid: "u9" })).toEqual({
      memberUids: { u9: "a.b" },
      round: { votes: { "a.b": { dates: [] } } },
    });
  });

  it(`${LOGIN_MAX_FAILURES}번 틀리면 잠근다`, () => {
    const now = 1_000_000;
    let entry = { failCount: 0, lockedUntil: 0 };
    for (let i = 1; i < LOGIN_MAX_FAILURES; i += 1) {
      entry = failureState(entry, now);
      expect(entry.locked).toBe(false);
    }
    entry = failureState(entry, now);
    expect(entry.locked).toBe(true);
    expect(isLocked(entry, now + 1000)).toBe(true);
    expect(isLocked(entry, entry.lockedUntil + 1)).toBe(false);
  });
});

describe("planKick / planLeave", () => {
  it("방장만 강퇴할 수 있고, 명단·투표·모든 기기 연결을 지운다", () => {
    expect(planKick({ room: room(), uid: "uHost", target: "a.b" })).toEqual({
      members: { "a.b": DELETE },
      round: { votes: { "a.b": DELETE } },
      memberUids: { uAb1: DELETE, uAb2: DELETE },
    });

    expectCode(() => planKick({ room: room(), uid: "uAb1", target: "host" }), ROOM_ERRORS.NOT_HOST);
    expectCode(() => planKick({ room: room(), uid: "stranger", target: "a.b" }), ROOM_ERRORS.NOT_MEMBER);
  });

  it("방장이 나가면 방 삭제, 참가자는 본인만 빠진다", () => {
    expect(planLeave({ room: room(), uid: "uHost" }).deleteRoom).toBe(true);

    const plan = planLeave({ room: room(), uid: "uAb2" });
    expect(plan.deleteRoom).toBe(false);
    expect(plan.name).toBe("a.b");
    expect(plan.patch.members).toEqual({ "a.b": DELETE });
  });
});

describe("planUpdateRoom", () => {
  const input = {
    title: " 새 제목 ",
    roundTitle: " 정기 모임 ",
    start: "2026-10-02",
    end: "2026-10-05",
    maxPeople: 4,
  };

  it("기간 밖으로 빠진 날짜만 이번 회차 투표에서 지운다", () => {
    const { patch, removedCount } = planUpdateRoom({ room: room(), uid: "uHost", ...input });

    expect(removedCount).toBe(1);
    expect(patch.title).toBe("새 제목");
    expect(patch.maxPeople).toBe(4);
    expect(patch.round.title).toBe("정기 모임");
    expect(patch.round.dates).toEqual(["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]);
    // 바뀐 사람(host)만 포함, a.b는 그대로
    expect(patch.round.votes).toEqual({ host: { dates: ["2026-10-03"] } });
  });

  it("회차 제목을 비우면 null(= N회차)로 저장한다", () => {
    const { patch } = planUpdateRoom({ room: room(), uid: "uHost", ...input, roundTitle: "  " });
    expect(patch.round.title).toBeNull();
  });

  it("방장만, 참가자 수 이상으로, 확정 전에만 바꿀 수 있다", () => {
    expectCode(() => planUpdateRoom({ room: room(), uid: "uAb1", ...input }), ROOM_ERRORS.NOT_HOST);
    expectCode(
      () => planUpdateRoom({ room: room(), uid: "uHost", ...input, maxPeople: 1 }),
      ROOM_ERRORS.VALIDATION
    );
    expectCode(() => planUpdateRoom({ room: closedRoom(), uid: "uHost", ...input }), ROOM_ERRORS.ROOM_CLOSED);
  });
});

describe("날짜 확정 / 확정 취소", () => {
  it("확정일 + 3개월이 끝나는 순간에 자동 삭제되게 한다", () => {
    expect(kst(expireAtFor("2026-10-02"))).toBe("2027-01-03T00:00");
    expect(kst(expireAtFor("2026-11-30"))).toBe("2027-03-01T00:00"); // 2월 말일로 맞춤
  });

  it("방장만, 기간 안의 날짜로 확정할 수 있다", () => {
    const patch = planFinalize({ room: room(), uid: "uHost", date: "2026-10-02" });
    expect(patch.round).toEqual({ status: "closed", finalDate: "2026-10-02" });
    expect(kst(patch.expireAt)).toBe("2027-01-03T00:00");
    expectCode(() => planFinalize({ room: room(), uid: "uAb1", date: "2026-10-02" }), ROOM_ERRORS.NOT_HOST);
    expectCode(() => planFinalize({ room: room(), uid: "uHost", date: "2026-12-25" }), ROOM_ERRORS.VALIDATION);
  });

  it("확정된 회차는 다시 확정할 수 없고, 확정 취소만 된다", () => {
    expectCode(() => planFinalize({ room: closedRoom(), uid: "uHost", date: "2026-10-01" }), ROOM_ERRORS.ROOM_CLOSED);
    const patch = planReopen({ room: closedRoom(), uid: "uHost" });
    expect(patch.round.status).toBe("open");
    expect(patch.round.finalDate).toBe(DELETE);
    expectCode(() => planReopen({ room: room(), uid: "uHost" }), ROOM_ERRORS.ROOM_NOT_CLOSED);
  });
});

describe("planOpenNextRound", () => {
  it("확정한 회차를 기록하고, 참가자는 유지한 채 투표를 비운 새 회차를 연다", () => {
    const next = planOpenNextRound({
      room: closedRoom(),
      uid: "uHost",
      start: "2026-11-01",
      end: "2026-11-02",
    });

    expect(next.round).toEqual({
      no: 2,
      title: null,
      dates: ["2026-11-01", "2026-11-02"],
      votes: { host: { dates: [] }, "a.b": { dates: [] } },
      status: "open",
    });
    expect(next.history).toEqual([{ no: 1, title: null, finalDate: "2026-10-02" }]);
    expect(kst(next.expireAt)).toBe("2027-02-03T00:00");
  });

  it("회차 제목을 정할 수 있고, 지난 기록 뒤에 이어 붙는다", () => {
    const r = closedRoom();
    r.round.no = 3;
    r.round.title = "가을 모임";
    r.history = [{ no: 1, title: null, finalDate: "2026-08-01" }, { no: 2, title: null, finalDate: "2026-09-01" }];

    const next = planOpenNextRound({ room: r, uid: "uHost", start: "2026-11-01", end: "2026-11-01", title: " 송년회 " });
    expect(next.round.no).toBe(4);
    expect(next.round.title).toBe("송년회");
    expect(next.history.map((h) => h.no)).toEqual([1, 2, 3]);
    expect(next.history[2]).toEqual({ no: 3, title: "가을 모임", finalDate: "2026-10-02" });
  });

  it("확정 전이거나 방장이 아니면 열 수 없다", () => {
    const args = { start: "2026-11-01", end: "2026-11-02" };
    expectCode(() => planOpenNextRound({ room: room(), uid: "uHost", ...args }), ROOM_ERRORS.ROOM_NOT_CLOSED);
    expectCode(() => planOpenNextRound({ room: closedRoom(), uid: "uAb1", ...args }), ROOM_ERRORS.NOT_HOST);
    expectCode(
      () => planOpenNextRound({ room: closedRoom(), uid: "uHost", start: "2026-01-01", end: "2026-12-31" }),
      ROOM_ERRORS.VALIDATION
    );
  });
});

describe("toRoundShape (예전 구조 변환)", () => {
  it("votes·dates·status를 members + round로 옮긴다", () => {
    const legacy = {
      title: "옛방",
      maxPeople: 3,
      hostId: "kim",
      dates: ["2026-10-10", "2026-10-11"],
      status: "closed",
      finalDate: "2026-10-11",
      votes: { kim: { dates: ["2026-10-11"] }, lee: {} },
      memberUids: { u1: "kim" },
    };
    const r = toRoundShape(legacy);
    expect(Object.keys(r.members)).toEqual(["kim", "lee"]);
    expect(r.round).toEqual({
      no: 1,
      title: null,
      dates: ["2026-10-10", "2026-10-11"],
      votes: { kim: { dates: ["2026-10-11"] }, lee: { dates: [] } },
      status: "closed",
      finalDate: "2026-10-11",
    });
    expect(r.votes).toBeUndefined();
    expect(r.dates).toBeUndefined();
    expect(toRoundShape(r)).toBe(r); // 이미 회차 구조면 그대로
  });
});
