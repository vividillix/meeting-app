import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFeedback } from "../../components/feedback/feedbackContext";
import { ROUTES } from "../../constants/routes";
import { getRoomErrorMessage } from "../../constants/roomErrors";
import { ensureUser } from "../../lib/auth";
import * as roomService from "../../services/roomService";

/**
 * 휴대폰·태블릿에서만 기기 공유창을 씀.
 * reason: 맥·PC의 공유 메뉴에는 "복사"가 없어서 링크를 복사할 방법이 없음 → PC는 바로 복사
 */
function shouldUseShareSheet() {
  if (typeof navigator.share !== "function") return false;
  const coarsePointer =
    typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return coarsePointer || navigator.userAgentData?.mobile === true;
}

export function useRoom() {
  const { id: roomId } = useParams();
  const nav = useNavigate();
  const { toast, confirm } = useFeedback();

  const [uid, setUid] = useState(null);
  const [room, setRoom] = useState(null);
  const [pendingSelected, setPendingSelected] = useState(null);
  // null이면 자동: 아직 투표 안 했으면 수정 모드, 했으면 보기 모드
  const [editingOverride, setEditingOverride] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  // reason: 내가 누른 나가기·방 삭제 때문에 생긴 변화는 "강퇴됨/없는 방" 안내를 띄우지 않기 위함
  const leavingRef = useRef(false);
  const wasMemberRef = useRef(false);

  // 이 브라우저(uid)가 방에서 쓰는 닉네임 — 서버가 입장·생성 때 연결해 둠
  const myName = room && uid ? roomService.getMemberName(room, uid) : null;
  const session = myName ? { id: roomId, name: myName } : null;

  // 진행 중 회차의 투표 (회차 구조: room.round.votes)
  const votes = useMemo(() => roomService.roundVotes(room), [room]);
  const serverSelected = myName ? votes[myName]?.dates || [] : [];
  // reason: 방장이 기간을 줄이면, 수정 중이던 선택에서도 범위 밖 날짜를 뺌
  const roomDates = roomService.roundDates(room);
  const selected = (pendingSelected ?? serverSelected).filter((d) => roomDates.includes(d));
  // 저장하지 않은 변경이 있는지 (순서와 무관하게 비교)
  const dirty =
    pendingSelected !== null &&
    (selected.length !== serverSelected.length ||
      selected.some((d) => !serverSelected.includes(d)));

  // reason: 저장한 뒤에는 날짜를 눌러도 명단만 보이게 하고, "수정하기"를 눌러야 투표가 바뀌게 함
  const hasVoted = serverSelected.length > 0;
  // 날짜가 확정된 방은 투표가 끝나서 항상 보기 모드
  const closed = roomService.isClosed(room);
  const finalDate = roomService.finalDateOf(room);
  const editing = !closed && (editingOverride ?? !hasVoted);

  const startEditing = () => setEditingOverride(true);

  const cancelEditing = () => {
    setPendingSelected(null);
    setEditingOverride(false);
  };
  const isHost = !!myName && myName === room?.hostId;
  const participants = roomService.memberNames(room);

  const voteSummary = useMemo(() => roomService.computeVoteSummary(votes), [votes]);

  useEffect(() => {
    let cancelled = false;

    ensureUser()
      .then((user) => {
        if (!cancelled) setUid(user.uid);
      })
      .catch(() => {
        toast("접속에 실패했어요. 새로고침해 주세요", { type: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    const unsub = roomService.subscribeRoom(
      roomId,
      (data) => setRoom(data),
      () => {
        if (leavingRef.current) return;
        // reason: 삭제·없는 방은 NotFound 전용 화면으로 이동
        nav(ROUTES.NOT_FOUND);
      },
      () => {
        toast("방 정보를 불러오지 못했어요. 새로고침해 주세요", { type: "error" });
      }
    );

    return () => unsub();
  }, [roomId, nav, toast]);

  // 참가자가 아니면 입장 화면으로. 보던 중에 빠졌다면 강퇴된 것
  useEffect(() => {
    if (!room || !uid || leavingRef.current) return;

    if (myName) {
      wasMemberRef.current = true;
      return;
    }

    if (wasMemberRef.current) {
      toast("방에서 내보내졌어요", { type: "error" });
    }
    nav(ROUTES.join(roomId), { replace: true });
  }, [room, uid, myName, roomId, nav, toast]);

  const toggleDate = (date) => {
    if (!editing) return;
    const current = selected;
    setPendingSelected(
      current.includes(date)
        ? current.filter((d) => d !== date)
        : [...current, date]
    );
  };

  const submitVote = async () => {
    if (saving || !myName) return;

    const dates = selected;
    setSaving(true);

    try {
      await roomService.saveVote({ roomId, nickname: myName, dates });
      // reason: 실시간 구독(onSnapshot)이 저장 결과를 바로 반영하므로 직접 수정할 필요 없음
      setPendingSelected(null);
      setEditingOverride(false);
      toast("투표를 저장했어요");
    } catch (error) {
      toast(getRoomErrorMessage(error, "투표 저장에 실패했어요. 다시 시도해 주세요"), {
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const kickUser = async (target) => {
    if (!isHost || busy) return;

    const ok = await confirm({
      title: `${target} 님을 내보낼까요?`,
      message: "내보내면 이 사람의 투표도 함께 지워져요.",
      confirmText: "내보내기",
      danger: true,
    });
    if (!ok) return;

    setBusy(true);

    try {
      await roomService.kickParticipant({ roomId, target });
      toast(`${target} 님을 내보냈어요`);
    } catch (error) {
      toast(getRoomErrorMessage(error, "내보내기에 실패했어요. 다시 시도해 주세요"), {
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const leaveRoom = async () => {
    if (busy) return;

    const ok = await confirm(
      isHost
        ? {
            title: "방을 삭제할까요?",
            message: "삭제하면 모든 참가자의 투표가 사라지고 되돌릴 수 없어요.",
            confirmText: "삭제",
            danger: true,
          }
        : {
            title: "방에서 나갈까요?",
            message: "내 투표도 함께 지워져요.",
            confirmText: "나가기",
            danger: true,
          }
    );
    if (!ok) return;

    setBusy(true);
    leavingRef.current = true;

    let deleted;
    try {
      ({ deleted } = await roomService.leaveRoom({ roomId }));
    } catch (error) {
      leavingRef.current = false;
      setBusy(false);
      toast(
        getRoomErrorMessage(
          error,
          isHost
            ? "방 삭제에 실패했어요. 다시 시도해 주세요"
            : "나가기에 실패했어요. 다시 시도해 주세요"
        ),
        { type: "error" }
      );
      return;
    }

    if (deleted) {
      toast("방을 삭제했어요");
      nav(ROUTES.HOME);
      return;
    }

    nav(ROUTES.join(roomId));
  };

  /**
   * 휴대폰에서는 기기 공유창(카카오톡·메시지 등)을 띄우고,
   * 공유창이 없는 환경(PC 등)에서는 링크를 복사함.
   * reason: 공유창은 https 주소에서만 뜸 — 로컬 개발 서버에서는 복사로 넘어감
   */
  const shareLink = async () => {
    const url = roomService.buildShareLink(roomId);
    const text = roomService.buildShareText({ roomId, title: room?.title });

    if (shouldUseShareSheet()) {
      try {
        // reason: 아이폰 공유창의 "복사"는 text와 url을 따로 주면 text만 복사함
        // → 제목과 링크를 text 하나에 담아서 복사·카톡 어디로 보내도 링크가 같이 가게 함
        await navigator.share({ text });
        return;
      } catch (error) {
        // 사용자가 공유창을 닫은 경우는 조용히 끝냄
        if (error?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      toast("링크를 복사했어요");
    } catch {
      // reason: 클립보드 권한이 없으면 링크를 보여주고 직접 복사하게 함
      await confirm({
        title: "아래 링크를 복사해 주세요",
        message: url,
        confirmText: "닫기",
        alertOnly: true,
      });
    }
  };

  // 방장: 날짜 확정 (확정창에서 고른 날짜)
  const finalize = async (date) => {
    if (!isHost || busy) return false;
    setBusy(true);
    try {
      await roomService.finalizeRoom({ roomId, date });
      setPendingSelected(null);
      setEditingOverride(null);
      toast("약속 날짜를 확정했어요");
      return true;
    } catch (error) {
      toast(getRoomErrorMessage(error, "확정에 실패했어요. 다시 시도해 주세요"), { type: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  // 방장: 확정 취소
  const reopen = async () => {
    if (!isHost || busy) return;

    const ok = await confirm({
      title: "확정을 취소할까요?",
      message: "다시 투표할 수 있게 열려요. 참가자들의 기존 투표는 그대로 남아 있어요.",
      confirmText: "확정 취소",
    });
    if (!ok) return;

    setBusy(true);
    try {
      await roomService.reopenRoom({ roomId });
      toast("다시 투표할 수 있게 열었어요");
    } catch (error) {
      toast(getRoomErrorMessage(error, "확정 취소에 실패했어요. 다시 시도해 주세요"), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const getParticipantsForDate = (date) =>
    roomService.getParticipantsForDate(votes, date);

  const isDateSelectedByOthers = (date) =>
    Object.entries(votes).some(
      ([name, user]) => name !== myName && user?.dates?.includes(date)
    );

  return {
    room,
    session,
    selected,
    dirty,
    hasVoted,
    editing,
    closed,
    finalDate,
    votes,
    dates: roomDates,
    finalize,
    reopen,
    startEditing,
    cancelEditing,
    saving,
    busy,
    isHost,
    participants,
    voteSummary,
    toggleDate,
    submitVote,
    kickUser,
    leaveRoom,
    shareLink,
    getParticipantsForDate,
    isDateSelectedByOthers,
  };
}
