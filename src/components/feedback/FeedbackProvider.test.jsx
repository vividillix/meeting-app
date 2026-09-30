import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useFeedback } from "./feedbackContext";
import FeedbackProvider from "./FeedbackProvider";

function Demo({ onResult }) {
  const { toast, confirm } = useFeedback();
  return (
    <>
      <button type="button" onClick={() => toast("저장했어요")}>토스트</button>
      <button
        type="button"
        onClick={async () =>
          onResult(await confirm({ title: "삭제할까요?", confirmText: "삭제", danger: true }))
        }
      >
        확인창
      </button>
    </>
  );
}

function setup() {
  const results = [];
  render(
    <FeedbackProvider>
      <Demo onResult={(r) => results.push(r)} />
    </FeedbackProvider>
  );
  return { user: userEvent.setup(), results };
}

describe("FeedbackProvider", () => {
  it("토스트를 화면 안에 보여준다", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "토스트" }));
    expect(screen.getByRole("status")).toHaveTextContent("저장했어요");
  });

  it("확인창에서 누른 버튼에 따라 true/false를 돌려준다", async () => {
    const { user, results } = setup();

    await user.click(screen.getByRole("button", { name: "확인창" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("삭제할까요?");
    await user.click(screen.getByRole("button", { name: "삭제" }));

    await user.click(screen.getByRole("button", { name: "확인창" }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    await user.click(screen.getByRole("button", { name: "확인창" }));
    await user.keyboard("{Escape}");

    await waitFor(() => expect(results).toEqual([true, false, false]));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
