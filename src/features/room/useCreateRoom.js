import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { ROOM_ERROR_MESSAGES } from "../../constants/roomErrors";
import * as roomService from "../../services/roomService";

export function useCreateRoom() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [maxPeople, setMaxPeople] = useState(2);
  const [loading, setLoading] = useState(false);

  const submit = async (overrides = {}) => {
    setLoading(true);

    try {
      const roomId = await roomService.createRoom({
        title,
        start,
        end,
        maxPeople: overrides.maxPeople ?? maxPeople,
      });
      nav(ROUTES.join(roomId));
    } catch (error) {
      const message =
        ROOM_ERROR_MESSAGES[error.code] || error.message || "방 생성 실패";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    title,
    setTitle,
    start,
    setStart,
    end,
    setEnd,
    maxPeople,
    setMaxPeople,
    loading,
    submit,
  };
}
