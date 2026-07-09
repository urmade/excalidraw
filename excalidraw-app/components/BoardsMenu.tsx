import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@excalidraw/excalidraw/components/Button";
import { TextField } from "@excalidraw/excalidraw/components/TextField";
import { t } from "@excalidraw/excalidraw/i18n";

import { useAtomValue } from "../app-jotai";
import { boardsIndexAtom } from "../boards-jotai";

import "./BoardsMenu.scss";

type BoardsMenuProps = {
  onCreateBoard: () => Promise<void>;
  onSwitchBoard: (boardId: string) => Promise<void>;
  onRenameBoard: (boardId: string, title: string) => Promise<void>;
};

export const BoardsMenu = ({
  onCreateBoard,
  onSwitchBoard,
  onRenameBoard,
}: BoardsMenuProps) => {
  const boardsIndex = useAtomValue(boardsIndexAtom);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingBoardId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingBoardId]);

  const startRenaming = useCallback((boardId: string, title: string) => {
    setEditingBoardId(boardId);
    setEditingTitle(title);
  }, []);

  const commitRename = useCallback(async () => {
    if (!editingBoardId) {
      return;
    }

    const nextTitle = editingTitle.trim() || t("boards.untitled");
    await onRenameBoard(editingBoardId, nextTitle);
    setEditingBoardId(null);
    setEditingTitle("");
  }, [editingBoardId, editingTitle, onRenameBoard]);

  const cancelRename = useCallback(() => {
    setEditingBoardId(null);
    setEditingTitle("");
  }, []);

  const handleCreateBoard = useCallback(async () => {
    setIsCreating(true);
    try {
      await onCreateBoard();
    } finally {
      setIsCreating(false);
    }
  }, [onCreateBoard]);

  if (!boardsIndex) {
    return (
      <div className="boards-menu">
        <div className="boards-menu__empty">{t("boards.loading")}</div>
      </div>
    );
  }

  const activeBoardId = boardsIndex.activeBoardId;

  return (
    <div className="boards-menu">
      <div className="boards-menu__header">
        <div className="boards-menu__title">{t("boards.title")}</div>
        <Button
          className="boards-menu__create-button"
          onSelect={handleCreateBoard}
          disabled={isCreating}
          aria-label={t("boards.create")}
          title={t("boards.create")}
        >
          +
        </Button>
      </div>

      {boardsIndex.boards.length === 0 ? (
        <div className="boards-menu__empty">{t("boards.empty")}</div>
      ) : (
        <ul className="boards-menu__list">
          {boardsIndex.boards.map((board) => {
            const isActive = board.id === activeBoardId;
            const isEditing = editingBoardId === board.id;

            return (
              <li
                key={board.id}
                className={clsx("boards-menu__item", {
                  "boards-menu__item--active": isActive,
                })}
              >
                {isEditing ? (
                  <TextField
                    ref={renameInputRef}
                    className="boards-menu__rename-input"
                    value={editingTitle}
                    onChange={(value) => setEditingTitle(value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRename();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelRename();
                      }
                    }}
                    fullWidth
                  />
                ) : (
                  <button
                    type="button"
                    className="boards-menu__item-button"
                    onClick={() => onSwitchBoard(board.id)}
                    onDoubleClick={() => startRenaming(board.id, board.title)}
                  >
                    <span className="boards-menu__item-title">
                      {board.title}
                    </span>
                    <span className="boards-menu__item-meta">
                      {t("boards.elementCount", {
                        count: board.elementCount,
                      })}
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
