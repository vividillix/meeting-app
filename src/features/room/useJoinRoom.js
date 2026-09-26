import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { ROOM_ERRORS, getRoomErrorMessage } from "../../constants/roomErrors";
import { setSession } from "../../lib/session";
import * as roomService from "../../services/roomService";

export function useJoinRoom() {
  const { id: roomId } = useParams();
  const nav = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("new");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const data = await roomService.getRoomForJoin(roomId);
        if (!cancelled) setRoom(data);
      } catch (error) {
        // reason: 존재하지 않는 방은 NotFound 전용 화면으로 이동
        if (error.code === ROOM_ERRORS.ROOM_NOT_FOUND) {
          nav(ROUTES.NOT_FOUND);
          return;
        }

        alert(getRoomErrorMessage(error, "방 정보를 불러오지 못했어요"));
        nav(ROUTES.HOME);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [roomId, nav]);

  const enter = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const session = await roomService.joinRoom({
        roomId,
        mode,
        name,
        password,
      });
      setSession(session);
      nav(ROUTES.room(roomId));
    } catch (error) {
      alert(getRoomErrorMessage(error, "입장에 실패했어요. 다시 시도해 주세요"));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    room,
    roomId,
    loading,
    mode,
    setMode,
    name,
    setName,
    password,
    setPassword,
    submitting,
    enter,
  };
}
