import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFeedback } from "../../components/feedback/feedbackContext";
import { ROUTES } from "../../constants/routes";
import { ROOM_ERRORS, getRoomErrorMessage } from "../../constants/roomErrors";
import { ensureUser } from "../../lib/auth";
import * as roomService from "../../services/roomService";

/**
 * 방장 전용 화면(방 설정·다음 회차)에서 방을 한 번 불러오고 방장인지 확인.
 * check(room)이 문구를 반환하면 그 안내를 띄우고 방으로 돌려보냄
 */
export function useHostRoom({ check } = {}) {
  const { id: roomId } = useParams();
  const nav = useNavigate();
  const feedback = useFeedback();
  const { toast } = feedback;
  const [room, setRoom] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [data, user] = await Promise.all([
          roomService.getRoomForJoin(roomId),
          ensureUser(),
        ]);
        if (cancelled) return;

        // reason: 화면에서도 막고, 실제 권한 확인은 서버가 다시 함
        const blocked =
          roomService.getMemberName(data, user.uid) !== data.hostId
            ? "방장만 할 수 있어요"
            : check?.(data);
        if (blocked) {
          toast(blocked, { type: "error" });
          nav(ROUTES.room(roomId), { replace: true });
          return;
        }

        setRoom(data);
      } catch (error) {
        if (cancelled) return;
        if (error.code === ROOM_ERRORS.ROOM_NOT_FOUND) {
          nav(ROUTES.NOT_FOUND, { replace: true });
          return;
        }
        toast(getRoomErrorMessage(error, "방 정보를 불러오지 못했어요"), { type: "error" });
        nav(ROUTES.room(roomId), { replace: true });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // reason: check는 화면마다 고정된 함수라 처음 불러올 때만 쓰면 됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, nav, toast]);

  return { roomId, room, nav, ...feedback };
}
