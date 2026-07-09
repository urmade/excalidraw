import { useCallback, useEffect } from "react";

import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import {
  restoreAppState,
  restoreElements,
} from "@excalidraw/excalidraw/data/restore";

import { isInitializedImageElement } from "@excalidraw/element";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { FileId } from "@excalidraw/element/types";

import { appJotaiStore } from "../app-jotai";
import { boardsIndexAtom } from "../boards-jotai";
import { LocalBoards } from "../data/LocalBoards";
import { LocalData } from "../data/LocalData";
import { updateStaleImageStatuses } from "../data/FileManager";

import type { CollabAPI } from "../collab/Collab";

export const useBoards = (
  excalidrawAPI: ExcalidrawImperativeAPI | null,
  collabAPI: CollabAPI | null,
) => {
  const refreshBoards = useCallback(async () => {
    try {
      await LocalBoards.ensureInitialized();
      const index = await LocalBoards.loadBoardsIndex();
      appJotaiStore.set(boardsIndexAtom, index);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    refreshBoards();
  }, [refreshBoards]);

  const loadBoardImages = useCallback(async (api: ExcalidrawImperativeAPI) => {
    const fileIds = api.getSceneElements().reduce((acc, element) => {
      if (isInitializedImageElement(element)) {
        return acc.concat(element.fileId);
      }
      return acc;
    }, [] as FileId[]);

    if (!fileIds.length) {
      return;
    }

    const { loadedFiles, erroredFiles } = await LocalData.fileStorage.getFiles(
      fileIds,
    );

    if (loadedFiles.length) {
      api.addFiles(loadedFiles);
    }

    updateStaleImageStatuses({
      excalidrawAPI: api,
      erroredFiles,
      elements: api.getSceneElementsIncludingDeleted(),
    });
  }, []);

  const switchBoard = useCallback(
    async (boardId: string) => {
      if (!excalidrawAPI || collabAPI?.isCollaborating()) {
        return;
      }

      if (boardId === LocalBoards.getActiveBoardId()) {
        return;
      }

      LocalData.pauseSave("boardSwitch");
      LocalData.flushSave();

      try {
        await LocalBoards.setActiveBoardId(boardId);
        const scene = await LocalBoards.loadBoardScene(boardId);

        excalidrawAPI.updateScene({
          elements: restoreElements(scene?.elements ?? [], null, {
            repairBindings: true,
            deleteInvisibleElements: true,
          }),
          appState: restoreAppState(
            scene?.appState ?? null,
            excalidrawAPI.getAppState(),
          ),
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });

        await loadBoardImages(excalidrawAPI);
        await refreshBoards();
      } finally {
        LocalData.resumeSave("boardSwitch");
      }
    },
    [collabAPI, excalidrawAPI, loadBoardImages, refreshBoards],
  );

  const createBoard = useCallback(async () => {
    if (!excalidrawAPI || collabAPI?.isCollaborating()) {
      return;
    }

    LocalData.flushSave();
    const board = await LocalBoards.createBoard();
    await refreshBoards();
    await switchBoard(board.id);
  }, [collabAPI, excalidrawAPI, refreshBoards, switchBoard]);

  const renameBoard = useCallback(
    async (boardId: string, title: string) => {
      await LocalBoards.renameBoard(boardId, title);
      await refreshBoards();

      if (
        excalidrawAPI &&
        boardId === LocalBoards.getActiveBoardId() &&
        !collabAPI?.isCollaborating()
      ) {
        excalidrawAPI.updateScene({
          appState: { name: title.trim() || "Untitled" },
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      }
    },
    [collabAPI, excalidrawAPI, refreshBoards],
  );

  return {
    refreshBoards,
    switchBoard,
    createBoard,
    renameBoard,
  };
};

export const syncActiveBoardFromStorage = async (
  excalidrawAPI: ExcalidrawImperativeAPI,
) => {
  await LocalBoards.ensureInitialized();

  const activeBoardId = LocalBoards.getActiveBoardId();
  const index = await LocalBoards.loadBoardsIndex();
  appJotaiStore.set(boardsIndexAtom, index);

  const scene = await LocalBoards.loadBoardScene(activeBoardId);

  excalidrawAPI.updateScene({
    elements: restoreElements(scene?.elements ?? [], null, {
      repairBindings: true,
      deleteInvisibleElements: true,
    }),
    appState: restoreAppState(
      scene?.appState ?? null,
      excalidrawAPI.getAppState(),
    ),
    captureUpdate: CaptureUpdateAction.NEVER,
  });

  const fileIds =
    scene?.elements.reduce((acc: FileId[], element) => {
      if (isInitializedImageElement(element)) {
        return acc.concat(element.fileId);
      }
      return acc;
    }, [] as FileId[]) ?? [];

  if (fileIds.length) {
    const { loadedFiles, erroredFiles } = await LocalData.fileStorage.getFiles(
      fileIds,
    );

    if (loadedFiles.length) {
      excalidrawAPI.addFiles(loadedFiles);
    }

    updateStaleImageStatuses({
      excalidrawAPI,
      erroredFiles,
      elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
    });
  }
};
