// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ROOM_ERRORS } from "../../src/constants/roomErrors.js";
import { LOGIN_MAX_FAILURES } from "../../src/constants/limits.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  DELETE,
  failureState,
  generateRoomId,
  isLocked,
  planJoinNew,
  planKick,
  planLeave,
  planLogin,
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

const room = () => ({
  title: "모임",
  maxPeople: 3,
  hostId: "host",
  dates: ["2026-10-01"],
  votes: { host: { dates: [] }, "a.b": { dates: [] } },
  memberUids: { uHost: "host", uAb1: "a.b", uAb2: "a.b" },
});

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

describe("planJoinNew", () => {
  it("참가 정보와 이 기기 uid를 함께 등록한다", () => {
    expect(planJoinNew({ room: room(), name: "c", uid: "uC" })).toEqual({
      votes: { c: { dates: [] } },
      memberUids: { uC: "c" },
    });
  });

  it("중복 닉네임·인원 초과를 막는다", () => {
    expectCode(() => planJoinNew({ room: room(), name: "a.b", uid: "x" }), ROOM_ERRORS.DUPLICATE_NAME);
    const full = { ...room(), maxPeople: 2 };
    expectCode(() => planJoinNew({ room: full, name: "c", uid: "x" }), ROOM_ERRORS.ROOM_FULL);
  });

  it("방장 없는 예전 방은 첫 입장자가 방장이 된다", () => {
    const legacy = { ...room(), hostId: null, votes: {}, memberUids: {} };
    expect(planJoinNew({ room: legacy, name: "c", uid: "uC" }).hostId).toBe("c");
  });
});

describe("planLogin / 잠금", () => {
  it("없는 닉네임은 거부한다", () => {
    expectCode(() => planLogin({ room: room(), name: "zz", uid: "x" }), ROOM_ERRORS.USER_NOT_FOUND);
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

describe("planKick", () => {
  it("방장만 강퇴할 수 있고, 대상의 모든 기기 연결을 지운다", () => {
    expect(planKick({ room: room(), uid: "uHost", target: "a.b" })).toEqual({
      votes: { "a.b": DELETE },
      memberUids: { uAb1: DELETE, uAb2: DELETE },
    });

    expectCode(() => planKick({ room: room(), uid: "uAb1", target: "host" }), ROOM_ERRORS.NOT_HOST);
    expectCode(() => planKick({ room: room(), uid: "stranger", target: "a.b" }), ROOM_ERRORS.NOT_MEMBER);
  });
});

describe("planLeave", () => {
  it("방장이 나가면 방 삭제, 참가자는 본인만 빠진다", () => {
    expect(planLeave({ room: room(), uid: "uHost" }).deleteRoom).toBe(true);

    const plan = planLeave({ room: room(), uid: "uAb2" });
    expect(plan.deleteRoom).toBe(false);
    expect(plan.name).toBe("a.b");
    expect(plan.patch.votes).toEqual({ "a.b": DELETE });
  });
});
