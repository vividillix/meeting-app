// 참가자 동그라미 색 — 핵심 컬러와 어울리는 파스텔 (글자는 남색)
// reason: 추천 카드 배경(#C1D3FE)과 겹치지 않게 같은 파랑은 뺌
export const AVATAR_COLORS = [
  "#FFD3C2",
  "#DCCFFF",
  "#C6EBD6",
  "#FFE3A8",
  "#C9E7F5",
  "#FFCFE1",
  "#E3E8C4",
  "#D8E2FF",
];

/**
 * 참가자 순서대로 색을 배정 → 한 방 안에서는 최대한 겹치지 않음.
 * 목록에 없는 이름은 이름으로 계산한 색을 씀.
 */
export function buildAvatarColors(names = []) {
  return new Map(names.map((name, i) => [name, AVATAR_COLORS[i % AVATAR_COLORS.length]]));
}

export function avatarColor(name = "") {
  let hash = 0;
  for (const ch of name) {
    hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function avatarInitial(name = "") {
  return Array.from(name.trim())[0] ?? "?";
}
