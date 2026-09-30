import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeedback } from "../../components/feedback/feedbackContext";
import { ROUTES } from "../../constants/routes";
import { getRoomErrorMessage } from "../../constants/roomErrors";
import * as roomService from "../../services/roomService";

export function useCreateRoom() {
  const nav = useNavigate();
  const { toast } = useFeedback();
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
      const { roomId } = await roomService.createRoom({
        title,
        start,
        end,
        maxPeople: overrides.maxPeople ?? maxPeople,
        name,
        password,
      });
      // reason: 서버가 만든 사람을 방장으로 등록하고 이 브라우저와 연결해 둠 → 바로 방으로
      nav(ROUTES.room(roomId));
    } catch (error) {
      toast(getRoomErrorMessage(error, "방 생성에 실패했어요. 다시 시도해 주세요"), {
        type: "error",
      });
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
