import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "../constants/routes";
import { ROOM_ERROR_MESSAGES, ROOM_ERRORS } from "../constants/roomErrors";
import { callApi } from "../lib/api";
import { ensureUser } from "../lib/auth";
import * as roomRepository from "../repositories/roomRepository";
import FeedbackProvider from "../components/feedback/FeedbackProvider";
import Join from "./Join";
import NotFound from "./NotFound";

vi.mock("../lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("../repositories/roomRepository");
vi.mock("../lib/auth", () => ({ ensureUser: vi.fn(), getIdToken: vi.fn() }));
vi.mock("../lib/api", () => ({ callApi: vi.fn() }));

const mockRoom = {
  title: "테스트 모임",
  maxPeople: 5,
  hostId: "alice",
  votes: {
    alice: { dates: [] },
  },
  memberUids: { "uid-alice": "alice" },
};

function renderJoin(roomId = "room-1") {
  return render(
    <MemoryRouter initialEntries={[`/join/${roomId}`]}>
      <FeedbackProvider>
        <Routes>
          <Route path="/join/:id" element={<Join />} />
          <Route path="/room/:id" element={<div>ROOM PAGE</div>} />
          <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        </Routes>
      </FeedbackProvider>
    </MemoryRouter>
  );
}

// 화면 위쪽에 뜨는 알림(토스트) 목록
const toasts = () => Array.from(screen.getByRole("status").children).map((el) => el.textContent);

async function waitForJoinForm() {
  await waitFor(() => {
    expect(screen.queryByText("loading...")).not.toBeInTheDocument();
  });
}

describe("Join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureUser.mockResolvedValue({ uid: "uid-visitor" });
    callApi.mockResolvedValue({ name: "bob" });
    roomRepository.fetchRoom.mockResolvedValue({ exists: true, data: mockRoom });
  });

  it("기존 멤버 모드에서 존재하지 않는 닉네임으로 입장하면 안내 메시지를 표시한다", async () => {
    const user = userEvent.setup();

    renderJoin();

    await waitForJoinForm();

    expect(screen.getByText("테스트 모임")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "기존" }));
    await user.type(screen.getByPlaceholderText("닉네임"), "unknown");
    await user.type(screen.getByPlaceholderText("비밀번호"), "1234");
    await user.click(screen.getByRole("button", { name: "입장" }));

    await waitFor(() => {
      expect(toasts()).toEqual([ROOM_ERROR_MESSAGES.USER_NOT_FOUND]);
    });
    expect(callApi).not.toHaveBeenCalled();
  });

  it("존재하지 않는 방이면 NotFound 화면으로 이동한다", async () => {
    roomRepository.fetchRoom.mockResolvedValue({ exists: false, data: null });

    renderJoin("missing-room");

    await waitFor(() => {
      expect(screen.getByText("방을 찾을 수 없어요")).toBeInTheDocument();
    });

    expect(toasts()).toEqual([]);
  });

  it("신규 멤버 모드에서 이미 존재하는 닉네임으로 입장하면 중복 안내 메시지를 표시한다", async () => {
    const user = userEvent.setup();

    renderJoin();

    await waitForJoinForm();

    expect(screen.getByText("새로 참여하는 멤버입니다")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("닉네임"), "alice");
    await user.type(screen.getByPlaceholderText("비밀번호"), "5678");
    await user.click(screen.getByRole("button", { name: "입장" }));

    await waitFor(() => {
      expect(toasts()).toEqual([ROOM_ERROR_MESSAGES.DUPLICATE_NAME]);
    });
    expect(callApi).not.toHaveBeenCalled();
  });

  it("비밀번호가 틀리면 서버가 보낸 안내를 표시한다", async () => {
    const user = userEvent.setup();
    const wrong = new Error(ROOM_ERROR_MESSAGES.WRONG_PASSWORD);
    wrong.code = ROOM_ERRORS.WRONG_PASSWORD;
    callApi.mockRejectedValue(wrong);

    renderJoin();
    await waitForJoinForm();

    await user.click(screen.getByRole("button", { name: "기존" }));
    await user.type(screen.getByPlaceholderText("닉네임"), "alice");
    await user.type(screen.getByPlaceholderText("비밀번호"), "0000");
    await user.click(screen.getByRole("button", { name: "입장" }));

    await waitFor(() => {
      expect(toasts()).toEqual([ROOM_ERROR_MESSAGES.WRONG_PASSWORD]);
    });
    expect(callApi).toHaveBeenCalledWith("rooms/join", {
      roomId: "room-1",
      mode: "existing",
      name: "alice",
      password: "0000",
    });
  });

  it("신규 입장에 성공하면 방 화면으로 이동한다", async () => {
    const user = userEvent.setup();

    renderJoin();
    await waitForJoinForm();

    await user.type(screen.getByPlaceholderText("닉네임"), "bob");
    await user.type(screen.getByPlaceholderText("비밀번호"), "pw");
    await user.click(screen.getByRole("button", { name: "입장" }));

    await waitFor(() => {
      expect(screen.getByText("ROOM PAGE")).toBeInTheDocument();
    });
  });

  it("이 브라우저가 이미 참가 중이면 바로 방 화면으로 이동한다", async () => {
    ensureUser.mockResolvedValue({ uid: "uid-alice" });

    renderJoin();

    await waitFor(() => {
      expect(screen.getByText("ROOM PAGE")).toBeInTheDocument();
    });
  });
});
