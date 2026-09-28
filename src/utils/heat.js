// 가능 인원 비율을 0~5단계 색으로 (참가자가 많아도 같은 기준으로 보이게)
export function heatLevel(count, total) {
  if (!count || !total) return 0;
  return Math.min(5, Math.max(1, Math.ceil((count / total) * 5)));
}
