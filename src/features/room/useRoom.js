import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { getRoomErrorMessage } from "../../constants/roomErrors";
import { clearSession, getSession } from "../../lib/session";
import * as roomService from "../../services/roomService";

export function useRoom() {
  const { id: roomId } = useParams();
  const nav = useNavigate();
  const session = useMemo(() => getSession(roomId), [roomId]);

  const [room, setRoom] = useState(null);
  const [pendingSelected, setPendingSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const votes = room?.votes || {};
  const myVote = session && Object.prototype.hasOwnProperty.call(votes, session.name)
    ? votes[session.name]
    : null;
  const serverSelected = myVote?.dates || [];
  const selected = pendingSelected ?? serverSelected;
  const isHost = !!session && session.name === room?.hostId;
  const participants = Object.keys(votes);

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
      },
      () => {
        alert("방 정보를 불러오지 못했어요. 새로고침해 주세요");
      }
    );

    return () => unsub();
  }, [roomId, nav]);

  const toggleDate = (date) => {
    const current = pendingSelected ?? serverSelected;
    setPendingSelected(
      current.includes(date)
        ? current.filter((d) => d !== date)
        : [...current, date]
    );
  };

  const submitVote = async () => {
    if (saving) return;

    const dates = pendingSelected ?? serverSelected;
    setSaving(true);

    try {
      await roomService.saveVote({
        roomId,
        nickname: session.name,
        dates,
      });
      // reason: 실시간 구독(onSnapshot)이 저장 결과를 바로 반영하므로 직접 수정할 필요 없음
      setPendingSelected(null);
      alert("저장 완료");
    } catch (error) {
      alert(getRoomErrorMessage(error, "투표 저장에 실패했어요. 다시 시도해 주세요"));
    } finally {
      setSaving(false);
    }
  };

  const kickUser = async (target) => {
    if (!isHost || busy) return;

    const ok = window.confirm(`${target} 님을 강퇴하시겠습니까?`);
    if (!ok) return;

    setBusy(true);

    try {
      await roomService.kickParticipant({
        roomId,
        hostNickname: session.name,
        target,
        room,
      });
    } catch (error) {
      alert(getRoomErrorMessage(error, "강퇴에 실패했어요. 다시 시도해 주세요"));
    } finally {
      setBusy(false);
    }
  };

  const leaveRoom = async () => {
    if (busy) return;

    const ok = window.confirm(
      isHost
        ? "방을 삭제하시겠습니까?\n삭제하면 모든 데이터가 사라집니다."
        : "방을 나가시겠습니까?"
    );
    if (!ok) return;

    setBusy(true);

    try {
      await roomService.leaveRoom({
        roomId,
        nickname: session.name,
        isHost,
      });
    } catch (error) {
      alert(
        getRoomErrorMessage(
          error,
          isHost ? "방 삭제에 실패했어요. 다시 시도해 주세요" : "나가기에 실패했어요. 다시 시도해 주세요"
        )
      );
      setBusy(false);
      return;
    }

    clearSession(roomId);

    if (isHost) {
      alert("방 삭제 완료");
      nav(ROUTES.HOME);
      return;
    }

    nav(ROUTES.join(roomId));
  };

  const copyShareLink = async () => {
    const text = roomService.buildShareText({
      roomId,
      title: room?.title,
    });

    try {
      await navigator.clipboard.writeText(text);
      alert("복사됨");
    } catch {
      // reason: 클립보드 권한이 없거나 http 환경이면 복사가 실패함 — 직접 복사하도록 보여줌
      window.prompt("아래 링크를 복사해 주세요", text);
    }
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
    saving,
    busy,
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
