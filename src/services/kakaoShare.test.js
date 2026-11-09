import { buildKakaoTemplate } from "./kakaoShare";

const origin = "https://example.app";

function room({ no = 1, title = null, status = "open", finalDate } = {}) {
  return {
    title: "동기 모임",
    members: { 솔지: {}, 민수: {}, 하은: {}, 지우: {} },
    round: {
      no,
      title,
      dates: ["2026-11-02", "2026-11-03", "2026-11-14", "2026-11-15"],
      votes: {
        솔지: { dates: ["2026-11-14", "2026-11-15"] },
        민수: { dates: ["2026-11-14"] },
        하은: { dates: ["2026-11-15"] },
        지우: { dates: [] },
      },
      status,
      finalDate,
    },
    history: [],
  };
}

describe("카카오 공유 카드", () => {
  it("투표 중: 기간과 투표 인원, 투표 링크를 담는다", () => {
    const t = buildKakaoTemplate({ room: room(), roomId: "abc123xyz9", origin });
    expect(t.objectType).toBe("feed");
    expect(t.content.title).toBe("동기 모임");
    expect(t.content.description).toBe(
      "11월 2일 – 11월 15일 중 되는 날을 골라 주세요 · 4명 중 3명 투표했어요"
    );
    expect(t.content.imageUrl).toBe(`${origin}/share/vote.png`);
    expect(t.content.link.mobileWebUrl).toBe(`${origin}/join/abc123xyz9`);
    expect(t.buttons).toEqual([{ title: "투표하러 가기", link: t.content.link }]);
  });

  it("2회차부터는 회차 이름, 회차 제목이 있으면 그 제목을 붙인다", () => {
    expect(buildKakaoTemplate({ room: room({ no: 3 }), roomId: "r", origin }).content.title).toBe(
      "동기 모임 · 3회차"
    );
    expect(
      buildKakaoTemplate({ room: room({ title: "송년회" }), roomId: "r", origin }).content.title
    ).toBe("동기 모임 · 송년회");
  });

  it("확정 후: 확정일과 가능 인원, 확정 이미지를 담는다", () => {
    const t = buildKakaoTemplate({
      room: room({ no: 3, status: "closed", finalDate: "2026-11-14" }),
      roomId: "r",
      origin,
    });
    expect(t.content.title).toBe("11월 14일 (토)로 확정됐어요");
    expect(t.content.description).toBe("동기 모임 · 3회차 · 4명 중 2명 가능");
    expect(t.content.imageUrl).toBe(`${origin}/share/final.png`);
    expect(t.buttons[0].title).toBe("약속 보러 가기");
  });
});
