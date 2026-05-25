import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { clearSession, getSession } from "../../lib/session";
import * as roomService from "../../services/roomService";

export function useRoom() {
  const { id: roomId } = useParams();
  const nav = useNavigate();
  const session = useMemo(() => getSession(), []);

  const [room, setRoom] = useState(null);
  const [pendingSelected, setPendingSelected] = useState(null);

  const serverSelected = room?.votes?.[session?.name]?.dates || [];
  const selected = pendingSelected ?? serverSelected;
  const isHost = session?.name === room?.hostId;
  const participants = Object.keys(room?.votes || {});

  const voteSummary = useMemo(
    () => roomService.computeVoteSummary(room?.votes || {}),
    [room]
  );

  useEffect(() => {
    try {
      roomService.assertRoomMember(session, roomId);
    } catch {
      alert("로그인 필요");
      nav(ROUTES.join(roomId));
    }
  }, [roomId, nav, session]);

  useEffect(() => {
    const unsub = roomService.subscribeRoom(
      roomId,
      (data) => setRoom(data),
      () => {
        // reason: 삭제·없는 방은 NotFound 전용 화면으로 이동
        nav(ROUTES.NOT_FOUND);
      }
    );

    return () => unsub();
  }, [roomId, nav]);

  const votes = room?.votes || {};

  const toggleDate = (date) => {
    const current = pendingSelected ?? serverSelected;
    setPendingSelected(
      current.includes(date)
        ? current.filter((d) => d !== date)
        : [...current, date]
    );
  };

  const submitVote = async () => {
    const dates = pendingSelected ?? serverSelected;

    await roomService.saveVote({
      roomId,
      nickname: session.name,
      dates,
    });

    setRoom((prev) => ({
      ...prev,
      votes: {
        ...prev.votes,
        [session.name]: {
          ...prev.votes[session.name],
          dates,
        },
      },
    }));

    setPendingSelected(null);
    alert("저장 완료");
  };

  const kickUser = async (target) => {
    if (!isHost) return;

    const ok = window.confirm(`${target} 님을 강퇴하시겠습니까?`);
    if (!ok) return;

    await roomService.kickParticipant({
      roomId,
      hostNickname: session.name,
      target,
      room,
    });

    setRoom((prev) => {
      const newVotes = { ...prev.votes };
      delete newVotes[target];
      return { ...prev, votes: newVotes };
    });
  };

  const leaveRoom = async () => {
    if (isHost) {
      const ok = window.confirm(
        "방을 삭제하시겠습니까?\n삭제하면 모든 데이터가 사라집니다."
      );
      if (!ok) return;

      await roomService.leaveRoom({
        roomId,
        nickname: session.name,
        isHost: true,
      });

      clearSession();
      alert("방 삭제 완료");
      nav(ROUTES.HOME);
      return;
    }

    const ok = window.confirm("방을 나가시겠습니까?");
    if (!ok) return;

    await roomService.leaveRoom({
      roomId,
      nickname: session.name,
      isHost: false,
    });

    setRoom((prev) => {
      const newVotes = { ...prev.votes };
      delete newVotes[session.name];
      return { ...prev, votes: newVotes };
    });

    clearSession();
    nav(ROUTES.join(roomId));
  };

  const copyShareLink = async () => {
    const text = roomService.buildShareText({
      roomId,
      title: room?.title,
    });
    await navigator.clipboard.writeText(text);
    alert("복사됨");
  };

  const getParticipantsForDate = (date) =>
    roomService.getParticipantsForDate(votes, date);

  const isDateSelectedByOthers = (date) =>
    Object.entries(votes).some(
      ([name, user]) => name !== session?.name && user?.dates?.includes(date)
    );

  return {
    room,
    session,
    selected,
    isHost,
    participants,
    voteSummary,
    toggleDate,
    submitVote,
    kickUser,
    leaveRoom,
    copyShareLink,
    getParticipantsForDate,
    isDateSelectedByOthers,
  };
}
