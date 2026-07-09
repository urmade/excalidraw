import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { STORAGE_KEYS } from "../app_constants";
import { LocalBoards } from "../data/LocalBoards";

describe("LocalBoards", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn().mockImplementation((_, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve(new Response(JSON.stringify({ ok: true })));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    localStorage.clear();
    await LocalBoards.clearForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an initial board when no legacy data exists", async () => {
    const index = await LocalBoards.ensureInitialized();

    expect(index.boards).toHaveLength(1);
    expect(index.activeBoardId).toBe(index.boards[0].id);
    expect(index.boards[0].title).toBe("Untitled");

    const scene = await LocalBoards.loadBoardScene(index.activeBoardId);
    expect(scene?.elements).toEqual([]);
  });

  it("migrates legacy local storage into the first board", async () => {
    localStorage.setItem(
      STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS,
      JSON.stringify([{ id: "rect-1", type: "rectangle", isDeleted: false }]),
    );
    localStorage.setItem(
      STORAGE_KEYS.LOCAL_STORAGE_APP_STATE,
      JSON.stringify({ name: "Legacy board" }),
    );

    const index = await LocalBoards.ensureInitialized();
    const scene = await LocalBoards.loadBoardScene(index.activeBoardId);

    expect(index.boards[0].title).toBe("Legacy board");
    expect(scene?.elements).toHaveLength(1);
    expect(scene?.appState?.name).toBe("Legacy board");
  });

  it("creates, saves, and renames boards", async () => {
    await LocalBoards.ensureInitialized();
    const createdBoard = await LocalBoards.createBoard();

    expect(createdBoard.title).toBe("Board 2");

    await LocalBoards.saveBoardScene(createdBoard.id, {
      elements: [
        {
          id: "rect-2",
          type: "rectangle",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          angle: 0,
          strokeColor: "#000000",
          backgroundColor: "transparent",
          fillStyle: "hachure",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 1,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: null,
          seed: 1,
          version: 1,
          versionNonce: 1,
          isDeleted: false,
          boundElements: null,
          updated: 1,
          link: null,
          locked: false,
        } as unknown as ExcalidrawElement,
      ],
      appState: { name: "Updated board" },
    });

    const savedScene = await LocalBoards.loadBoardScene(createdBoard.id);
    expect(savedScene?.elements).toHaveLength(1);

    const index = await LocalBoards.loadBoardsIndex();
    expect(
      index.boards.find((board) => board.id === createdBoard.id)?.elementCount,
    ).toBe(1);

    await LocalBoards.renameBoard(createdBoard.id, "Renamed board");
    const renamedIndex = await LocalBoards.loadBoardsIndex();
    expect(
      renamedIndex.boards.find((board) => board.id === createdBoard.id)?.title,
    ).toBe("Renamed board");
  });

  it("switches the active board pointer", async () => {
    const index = await LocalBoards.ensureInitialized();
    const secondBoard = await LocalBoards.createBoard();

    await LocalBoards.setActiveBoardId(secondBoard.id);

    expect(LocalBoards.getActiveBoardId()).toBe(secondBoard.id);
    expect(localStorage.getItem(STORAGE_KEYS.ACTIVE_BOARD_ID)).toBe(
      secondBoard.id,
    );

    const updatedIndex = await LocalBoards.loadBoardsIndex();
    expect(updatedIndex.activeBoardId).toBe(secondBoard.id);
    expect(updatedIndex.boards.map((board) => board.id)).toContain(
      index.activeBoardId,
    );
  });

  it("hydrates boards from the dev disk snapshot when available", async () => {
    const snapshot = {
      version: 1,
      activeBoardId: "disk-board",
      boards: [
        {
          id: "disk-board",
          title: "Disk board",
          createdAt: 1,
          updatedAt: 2,
          elementCount: 1,
        },
      ],
      scenes: {
        "disk-board": {
          elements: [
            {
              id: "disk-rect",
              type: "rectangle",
              isDeleted: false,
            },
          ],
          appState: { name: "Disk board" },
          updatedAt: 2,
        },
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(snapshot), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const index = await LocalBoards.ensureInitialized();
    const scene = await LocalBoards.loadBoardScene(index.activeBoardId);

    expect(index.activeBoardId).toBe("disk-board");
    expect(index.boards[0].title).toBe("Disk board");
    expect(scene?.elements).toHaveLength(1);
    expect(scene?.appState?.name).toBe("Disk board");
  });

  it("persists board updates to the dev disk snapshot endpoint", async () => {
    await LocalBoards.ensureInitialized();
    fetchMock.mockClear();

    const board = await LocalBoards.createBoard();

    const putCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        url === "/api/dev/local-boards" && init?.method === "PUT",
    );

    expect(putCalls.length).toBeGreaterThan(0);
    expect(board.id).toBeTruthy();

    const lastPayload = JSON.parse(String(putCalls.at(-1)?.[1]?.body));
    expect(
      lastPayload.boards.some(
        (savedBoard: { id: string }) => savedBoard.id === board.id,
      ),
    ).toBe(true);
  });
});
