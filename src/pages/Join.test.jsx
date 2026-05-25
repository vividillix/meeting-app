import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "../constants/routes";
import { ROOM_ERROR_MESSAGES, ROOM_ERRORS } from "../constants/roomErrors";
import * as roomRepository from "../repositories/roomRepository";
import Join from "./Join";
import NotFound from "./NotFound";

vi.mock("../repositories/roomRepository");
vi.mock("../lib/session", () => ({
  setSession: vi.fn(),
}));

const mockRoom = {
  title: "테스트 모임",
  maxPeople: 5,
  hostId: "alice",
  votes: {
    alice: { password: "1234", dates: [] },
  },
};

function renderJoin(roomId = "room-1") {
  return render(
    <MemoryRouter initialEntries={[`/join/${roomId}`]}>
      <Routes>
        <Route path="/join/:id" element={<Join />} />
        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      </Routes>
    </MemoryRouter>
  );
}

async function waitForJoinForm() {
  await waitFor(() => {
    expect(screen.queryByText("loading...")).not.toBeInTheDocument();
  });
}

describe("Join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    roomRepository.fetchRoom.mockResolvedValue({ exists: true, data: mockRoom });
  });

  it("기존 멤버 모드에서 존재하지 않는 닉네임으로 입장하면 안내 메시지를 표시한다", async () => {
    const user = userEvent.setup();

    renderJoin();

    await waitForJoinForm();

    await user.click(screen.getByRole("button", { name: "기존" }));
    await user.type(screen.getByPlaceholderText("닉네임"), "unknown");
    await user.type(screen.getByPlaceholderText("비밀번호"), "1234");
    await user.click(screen.getByRole("button", { name: "입장" }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        ROOM_ERROR_MESSAGES.USER_NOT_FOUND
      );
    });

    expect(window.alert).toHaveBeenCalledTimes(1);
  });

  it("존재하지 않는 방이면 NotFound 화면으로 이동한다", async () => {
    const notFoundError = new Error(ROOM_ERROR_MESSAGES.ROOM_NOT_FOUND);
    notFoundError.code = ROOM_ERRORS.ROOM_NOT_FOUND;
    roomRepository.fetchRoom.mockRejectedValue(notFoundError);

    renderJoin("missing-room");

    await waitFor(() => {
      expect(screen.getByText("방을 찾을 수 없어요")).toBeInTheDocument();
    });

    expect(window.alert).not.toHaveBeenCalled();
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
      expect(window.alert).toHaveBeenCalledWith(
        ROOM_ERROR_MESSAGES.DUPLICATE_NAME
      );
    });

    expect(window.alert).toHaveBeenCalledTimes(1);
  });
});
