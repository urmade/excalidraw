import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { appJotaiStore, Provider } from "../app-jotai";
import { boardsIndexAtom } from "../boards-jotai";
import { BoardsMenu } from "../components/BoardsMenu";
import { STORAGE_KEYS } from "../app_constants";

import type { ComponentProps } from "react";

describe("BoardsMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    appJotaiStore.set(boardsIndexAtom, {
      activeBoardId: "board-1",
      boards: [
        {
          id: "board-1",
          title: "First board",
          createdAt: 1,
          updatedAt: 1,
          elementCount: 2,
        },
        {
          id: "board-2",
          title: "Second board",
          createdAt: 2,
          updatedAt: 2,
          elementCount: 0,
        },
      ],
    });
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BOARD_ID, "board-1");
  });

  const renderBoardsMenu = (props: ComponentProps<typeof BoardsMenu>) =>
    render(
      <Provider store={appJotaiStore}>
        <BoardsMenu {...props} />
      </Provider>,
    );

  it("renders boards and creates a new board", async () => {
    const onCreateBoard = vi.fn().mockResolvedValue(undefined);
    const onSwitchBoard = vi.fn().mockResolvedValue(undefined);
    const onRenameBoard = vi.fn().mockResolvedValue(undefined);

    renderBoardsMenu({
      onCreateBoard,
      onSwitchBoard,
      onRenameBoard,
    });

    expect(screen.getByText("First board")).toBeInTheDocument();
    expect(screen.getByText("Second board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New board" })).toHaveTextContent(
      "+",
    );

    fireEvent.click(screen.getByRole("button", { name: "New board" }));

    await waitFor(() => {
      expect(onCreateBoard).toHaveBeenCalledTimes(1);
    });
  });

  it("switches boards when an item is clicked", async () => {
    const onCreateBoard = vi.fn().mockResolvedValue(undefined);
    const onSwitchBoard = vi.fn().mockResolvedValue(undefined);
    const onRenameBoard = vi.fn().mockResolvedValue(undefined);

    renderBoardsMenu({
      onCreateBoard,
      onSwitchBoard,
      onRenameBoard,
    });

    fireEvent.click(screen.getByText("Second board"));

    await waitFor(() => {
      expect(onSwitchBoard).toHaveBeenCalledWith("board-2");
    });
  });

  it("renames a board on double click", async () => {
    const onCreateBoard = vi.fn().mockResolvedValue(undefined);
    const onSwitchBoard = vi.fn().mockResolvedValue(undefined);
    const onRenameBoard = vi.fn().mockResolvedValue(undefined);

    renderBoardsMenu({
      onCreateBoard,
      onSwitchBoard,
      onRenameBoard,
    });

    fireEvent.doubleClick(screen.getByText("First board"));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Renamed board" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onRenameBoard).toHaveBeenCalledWith("board-1", "Renamed board");
    });
  });
});
