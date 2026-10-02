import { useState } from "react";
import { ROUTES } from "../../constants/routes";
import { getRoomErrorMessage } from "../../constants/roomErrors";
import * as roomService from "../../services/roomService";
import { useHostRoom } from "./useHostRoom";

const checkClosed = (room) =>
  roomService.isClosed(room) ? null : "지금 회차의 날짜를 먼저 확정해 주세요";

export function useNextRound() {
  const { roomId, room, nav, toast } = useHostRoom({ check: checkClosed });
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const nextNo = (room?.round?.no ?? 1) + 1;

  const submit = async () => {
    if (saving) return;
    setSaving(true);

    try {
      await roomService.openNextRound({ roomId, start, end, title });
      // reason: 방 화면에서 "링크를 다시 공유하세요" 안내를 띄우도록 표시
      nav(ROUTES.room(roomId), { state: { announceRound: true } });
    } catch (error) {
      toast(getRoomErrorMessage(error, "다음 회차를 열지 못했어요. 다시 시도해 주세요"), {
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    loading: !room,
    room,
    nextNo,
    memberCount: roomService.memberNames(room).length,
    lastFinalDate: roomService.finalDateOf(room),
    title,
    setTitle,
    start,
    setStart,
    end,
    setEnd,
    saving,
    submit,
    goBack: () => nav(ROUTES.room(roomId)),
  };
}
