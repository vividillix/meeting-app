import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { getRoomErrorMessage } from "../../constants/roomErrors";
import { setSession } from "../../lib/session";
import * as roomService from "../../services/roomService";

export function useCreateRoom() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [maxPeople, setMaxPeople] = useState(2);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (overrides = {}) => {
    if (loading) return;
    setLoading(true);

    try {
      const { roomId, session } = await roomService.createRoom({
        title,
        start,
        end,
        maxPeople: overrides.maxPeople ?? maxPeople,
        name,
        password,
      });
      // reason: 만든 사람은 방장으로 이미 등록됐으니 입장 화면을 건너뛰고 바로 방으로
      setSession(session);
      nav(ROUTES.room(roomId));
    } catch (error) {
      alert(getRoomErrorMessage(error, "방 생성에 실패했어요. 다시 시도해 주세요"));
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
    name,
    setName,
    password,
    setPassword,
    loading,
    submit,
  };
}
