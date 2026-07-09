import { clearAppStateForLocalStorage } from "@excalidraw/excalidraw/appState";
import { randomId } from "@excalidraw/common";
import { createStore, get, set, clear } from "idb-keyval";

import {
  getNonDeletedElements,
  isInitializedImageElement,
} from "@excalidraw/element";

import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

import { STORAGE_KEYS } from "../app_constants";

import { importFromLocalStorage } from "./localStorage";
import { updateBrowserStateVersion } from "./tabSync";

export type BoardMetadata = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  elementCount: number;
};

export type BoardsIndex = {
  activeBoardId: string;
  boards: BoardMetadata[];
};

export type BoardSceneRecord = {
  elements: ExcalidrawElement[];
  appState: Partial<AppState> | null;
  updatedAt: number;
};

const BOARDS_INDEX_KEY = "boardsIndex";
const DEV_BOARDS_ENDPOINT = "/api/dev/local-boards";

const getBoardSceneKey = (boardId: string) => `board:${boardId}:scene`;

type BoardsDiskSnapshot = {
  version: 1;
  activeBoardId: string;
  boards: BoardMetadata[];
  scenes: Record<string, BoardSceneRecord>;
};

const boardsStore = createStore(
  `${STORAGE_KEYS.IDB_BOARDS}-db`,
  `${STORAGE_KEYS.IDB_BOARDS}-store`,
);

let activeBoardIdCache: string | null = null;
let initializationPromise: Promise<BoardsIndex> | null = null;

const getDefaultBoardTitle = (boardCount: number) =>
  boardCount === 0 ? "Untitled" : `Board ${boardCount + 1}`;

const canUseDiskPersistence = () =>
  typeof window !== "undefined" &&
  typeof fetch === "function" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

export class LocalBoards {
  static resetForTests() {
    activeBoardIdCache = null;
    initializationPromise = null;
  }

  static async clearForTests() {
    this.resetForTests();
    await clear(boardsStore);
  }

  private static async loadDiskSnapshot(): Promise<BoardsDiskSnapshot | null> {
    if (!canUseDiskPersistence()) {
      return null;
    }

    try {
      const response = await fetch(DEV_BOARDS_ENDPOINT, {
        cache: "no-store",
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.warn(
          "Couldn't load boards snapshot from disk",
          response.status,
        );
        return null;
      }

      const snapshot = (await response.json()) as Partial<BoardsDiskSnapshot>;

      if (
        snapshot.version !== 1 ||
        !snapshot.activeBoardId ||
        !Array.isArray(snapshot.boards)
      ) {
        return null;
      }

      return {
        version: 1,
        activeBoardId: snapshot.activeBoardId,
        boards: snapshot.boards,
        scenes: snapshot.scenes ?? {},
      };
    } catch (error) {
      console.warn("Couldn't load boards snapshot from disk", error);
      return null;
    }
  }

  private static async writeDiskSnapshot(snapshot: BoardsDiskSnapshot) {
    if (!canUseDiskPersistence()) {
      return;
    }

    try {
      const response = await fetch(DEV_BOARDS_ENDPOINT, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(snapshot),
      });

      if (!response.ok) {
        console.warn("Couldn't save boards snapshot to disk", response.status);
      }
    } catch (error) {
      console.warn("Couldn't save boards snapshot to disk", error);
    }
  }

  private static async hydrateFromDiskSnapshot(
    snapshot: BoardsDiskSnapshot,
  ): Promise<BoardsIndex> {
    const index: BoardsIndex = {
      activeBoardId: snapshot.activeBoardId,
      boards: snapshot.boards,
    };

    await clear(boardsStore);
    await set(BOARDS_INDEX_KEY, index, boardsStore);
    await Promise.all(
      snapshot.boards.map((board) =>
        set(
          getBoardSceneKey(board.id),
          snapshot.scenes[board.id] ?? {
            elements: [],
            appState: null,
            updatedAt: board.updatedAt,
          },
          boardsStore,
        ),
      ),
    );

    activeBoardIdCache = index.activeBoardId;
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BOARD_ID, index.activeBoardId);
    } catch (error) {
      console.error(error);
    }

    return index;
  }

  private static async createDiskSnapshot(
    index: BoardsIndex,
  ): Promise<BoardsDiskSnapshot> {
    const scenes = Object.fromEntries(
      await Promise.all(
        index.boards.map(async (board) => [
          board.id,
          (await this.loadBoardScene(board.id)) ?? {
            elements: [],
            appState: null,
            updatedAt: board.updatedAt,
          },
        ]),
      ),
    ) as Record<string, BoardSceneRecord>;

    return {
      version: 1,
      activeBoardId: index.activeBoardId,
      boards: index.boards.map((board) => ({ ...board })),
      scenes,
    };
  }

  private static async persistToDisk(index: BoardsIndex) {
    await this.writeDiskSnapshot(await this.createDiskSnapshot(index));
  }

  static getActiveBoardId(): string {
    if (activeBoardIdCache) {
      return activeBoardIdCache;
    }

    try {
      activeBoardIdCache = localStorage.getItem(STORAGE_KEYS.ACTIVE_BOARD_ID);
    } catch (error) {
      console.error(error);
    }

    if (!activeBoardIdCache) {
      throw new Error("Active board is not initialized");
    }

    return activeBoardIdCache;
  }

  static async loadBoardsIndex(): Promise<BoardsIndex> {
    const index = await get<BoardsIndex>(BOARDS_INDEX_KEY, boardsStore);
    if (!index) {
      throw new Error("Boards index is not initialized");
    }
    return index;
  }

  private static async saveBoardsIndex(
    index: BoardsIndex,
    persistToDisk = true,
  ) {
    await set(BOARDS_INDEX_KEY, index, boardsStore);
    activeBoardIdCache = index.activeBoardId;
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BOARD_ID, index.activeBoardId);
    } catch (error) {
      console.error(error);
    }

    if (persistToDisk) {
      await this.persistToDisk(index);
    }

    updateBrowserStateVersion(STORAGE_KEYS.VERSION_BOARDS_INDEX);
  }

  static async loadBoardScene(
    boardId: string,
  ): Promise<BoardSceneRecord | null> {
    return (
      (await get<BoardSceneRecord>(getBoardSceneKey(boardId), boardsStore)) ||
      null
    );
  }

  static async saveBoardScene(
    boardId: string,
    scene: {
      elements: readonly ExcalidrawElement[];
      appState: Partial<AppState>;
    },
  ) {
    const now = Date.now();
    const elements = getNonDeletedElements(scene.elements);
    const record: BoardSceneRecord = {
      elements: [...getNonDeletedElements(scene.elements)],
      appState: scene.appState,
      updatedAt: now,
    };

    await set(getBoardSceneKey(boardId), record, boardsStore);

    const index = await this.loadBoardsIndex();
    const board = index.boards.find(({ id }) => id === boardId);
    if (board) {
      board.updatedAt = now;
      board.elementCount = elements.length;
      await this.saveBoardsIndex(index, false);
    }

    await this.persistToDisk(index);
    updateBrowserStateVersion(STORAGE_KEYS.VERSION_DATA_STATE);
  }

  static async ensureInitialized(): Promise<BoardsIndex> {
    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      const diskSnapshot = await this.loadDiskSnapshot();
      if (diskSnapshot) {
        return this.hydrateFromDiskSnapshot(diskSnapshot);
      }

      const existingIndex = await get<BoardsIndex>(
        BOARDS_INDEX_KEY,
        boardsStore,
      );
      if (existingIndex) {
        activeBoardIdCache = existingIndex.activeBoardId;
        try {
          localStorage.setItem(
            STORAGE_KEYS.ACTIVE_BOARD_ID,
            existingIndex.activeBoardId,
          );
        } catch (error) {
          console.error(error);
        }
        return existingIndex;
      }

      const legacyData = importFromLocalStorage();
      const now = Date.now();
      const boardId = randomId();
      const title = legacyData.appState?.name?.trim() || "Untitled";

      const index: BoardsIndex = {
        activeBoardId: boardId,
        boards: [
          {
            id: boardId,
            title,
            createdAt: now,
            updatedAt: now,
            elementCount: legacyData.elements.length,
          },
        ],
      };

      const sceneRecord: BoardSceneRecord = {
        elements: legacyData.elements,
        appState: legacyData.appState
          ? clearAppStateForLocalStorage(legacyData.appState as AppState)
          : null,
        updatedAt: now,
      };

      await set(getBoardSceneKey(boardId), sceneRecord, boardsStore);
      await this.saveBoardsIndex(index);

      return index;
    })();

    return initializationPromise;
  }

  static async importActiveBoard() {
    const index = await this.ensureInitialized();
    const scene = await this.loadBoardScene(index.activeBoardId);

    return {
      elements: scene?.elements ?? [],
      appState: scene?.appState ?? null,
    };
  }

  static async setActiveBoardId(boardId: string) {
    const index = await this.loadBoardsIndex();
    if (!index.boards.some((board) => board.id === boardId)) {
      throw new Error(`Board ${boardId} does not exist`);
    }

    index.activeBoardId = boardId;
    await this.saveBoardsIndex(index);
  }

  static async createBoard(): Promise<BoardMetadata> {
    const index = await this.loadBoardsIndex();
    const now = Date.now();
    const boardId = randomId();
    const metadata: BoardMetadata = {
      id: boardId,
      title: getDefaultBoardTitle(index.boards.length),
      createdAt: now,
      updatedAt: now,
      elementCount: 0,
    };

    index.boards.unshift(metadata);
    const emptyScene: BoardSceneRecord = {
      elements: [],
      appState: null,
      updatedAt: now,
    };
    await set(getBoardSceneKey(boardId), emptyScene, boardsStore);
    await this.saveBoardsIndex(index);

    return metadata;
  }

  static async renameBoard(boardId: string, title: string) {
    const index = await this.loadBoardsIndex();
    const board = index.boards.find(({ id }) => id === boardId);

    if (!board) {
      throw new Error(`Board ${boardId} does not exist`);
    }

    board.title = title.trim() || "Untitled";
    board.updatedAt = Date.now();
    await this.saveBoardsIndex(index);
  }

  static async getAllReferencedFileIds() {
    const index = await this.loadBoardsIndex();
    const fileIds = new Set<string>();

    await Promise.all(
      index.boards.map(async (board) => {
        const scene = await this.loadBoardScene(board.id);
        scene?.elements.forEach((element) => {
          if (isInitializedImageElement(element)) {
            fileIds.add(element.fileId);
          }
        });
      }),
    );

    return [...fileIds] as FileId[];
  }
}
