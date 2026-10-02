import { useState } from "react";
import { ROUTES } from "../../constants/routes";
import { getRoomErrorMessage } from "../../constants/roomErrors";
import * as roomService from "../../services/roomService";
import { useHostRoom } from "./useHostRoom";

function formFromRoom(room) {
  const dates = roomService.roundDates(room);
  return {
    title: room.title ?? "",
    roundTitle: room.round?.title ?? "",
    start: dates[0] ?? "",
    end: dates[dates.length - 1] ?? "",
    maxPeople: room.maxPeople,
  };
}

const checkOpen = (room) =>
  roomService.isClosed(room) ? "확정된 약속은 바꿀 수 없어요. 확정을 취소한 뒤 바꿔 주세요" : null;

export function useRoomSettings() {
  const { roomId, room, nav, toast, confirm } = useHostRoom({ check: checkOpen });
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  // reason: 방을 불러오기 전엔 입력값이 없으므로, 처음엔 방 값을 그대로 보여주다가 고치면 draft로 바뀜
  const original = room ? formFromRoom(room) : null;
  const form = draft ?? original;

  const changed =
    !!form &&
    !!original &&
    (form.title.trim() !== original.title ||
      form.roundTitle.trim() !== original.roundTitle ||
      form.start !== original.start ||
      form.end !== original.end ||
      form.maxPeople !== original.maxPeople);

  const memberCount = roomService.memberNames(room).length;
  const preview =
    room && form
      ? roomService.previewRangeChange(room, form.start, form.end)
      : { removedCount: 0, affected: [] };

  const update = (key) => (value) => setDraft((prev) => ({ ...(prev ?? original), [key]: value }));

  const goBack = () => nav(ROUTES.room(roomId));

  const save = async () => {
    if (!changed || saving) return;

    if (preview.removedCount > 0) {
      const ok = await confirm({
        title: "일부 투표가 지워져요",
        message: `${preview.affected.length}명의 투표 중 날짜 ${preview.removedCount}개가 새 기간 밖이라 지워져요. 되돌릴 수 없어요.`,
        confirmText: "저장",
        danger: true,
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      await roomService.updateRoomSettings({ roomId, room, ...form });
      toast("방 설정을 저장했어요");
      nav(ROUTES.room(roomId));
    } catch (error) {
      toast(getRoomErrorMessage(error, "저장에 실패했어요. 다시 시도해 주세요"), { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return {
    loading: !form,
    form,
    roundNo: room?.round?.no ?? 1,
    memberCount,
    preview,
    changed,
    saving,
    setTitle: update("title"),
    setRoundTitle: update("roundTitle"),
    setStart: update("start"),
    setEnd: update("end"),
    setMaxPeople: update("maxPeople"),
    save,
    goBack,
  };
}
