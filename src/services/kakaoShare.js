// 카카오톡 공유 카드에 들어갈 내용 (방 상태에 맞춰 문구를 만듦)
import { APP_ORIGIN } from "../constants/app";
import { ROUTES } from "../constants/routes";
import {
  finalDateOf,
  memberNames,
  roundDates,
  roundLabel,
  roundVotes,
} from "../shared/roomRules.js";
import { formatMonthDay, formatWeekday } from "../utils/date";

// public/share 의 고정 이미지 (800×400). 방 이름·날짜는 제목·설명 글자로 들어감
const IMAGE_SIZE = { imageWidth: 800, imageHeight: 400 };

function shortDay(dateStr) {
  return `${formatMonthDay(dateStr)} (${formatWeekday(dateStr).slice(0, 1)})`;
}

// 2회차부터 또는 회차 제목이 있을 때만 회차 이름을 붙임 (방 화면 헤더와 같은 규칙)
function headline(room) {
  const round = room?.round;
  const showRound = (round?.no ?? 1) > 1 || Boolean(round?.title?.trim());
  return showRound ? `${room.title} · ${roundLabel(round)}` : room.title;
}

/**
 * Kakao.Share.sendDefault 에 넘길 feed 메시지.
 * - 투표 중: "11월 2일 – 11월 15일 중 되는 날을 골라 주세요 · 4명 중 3명 투표했어요"
 * - 확정 후: "11월 14일 (토)로 확정됐어요"
 */
export function buildKakaoTemplate({ room, roomId, origin = APP_ORIGIN }) {
  const url = `${origin}${ROUTES.join(roomId)}`;
  const link = { webUrl: url, mobileWebUrl: url };
  const votes = roundVotes(room);
  const members = memberNames(room);
  const total = members.length;
  const finalDate = finalDateOf(room);

  if (finalDate) {
    const available = members.filter((name) => votes[name]?.dates?.includes(finalDate)).length;
    return {
      objectType: "feed",
      content: {
        title: `${shortDay(finalDate)}로 확정됐어요`,
        description: `${headline(room)} · ${total}명 중 ${available}명 가능`,
        imageUrl: `${origin}/share/final.png`,
        ...IMAGE_SIZE,
        link,
      },
      buttons: [{ title: "약속 보러 가기", link }],
    };
  }

  const dates = roundDates(room);
  const voted = members.filter((name) => votes[name]?.dates?.length > 0).length;
  const range =
    dates.length > 0
      ? `${formatMonthDay(dates[0])} – ${formatMonthDay(dates[dates.length - 1])} 중 `
      : "";

  return {
    objectType: "feed",
    content: {
      title: headline(room),
      description: `${range}되는 날을 골라 주세요 · ${total}명 중 ${voted}명 투표했어요`,
      imageUrl: `${origin}/share/vote.png`,
      ...IMAGE_SIZE,
      link,
    },
    buttons: [{ title: "투표하러 가기", link }],
  };
}
