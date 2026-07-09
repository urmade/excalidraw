import { atom } from "./app-jotai";

import type { BoardsIndex } from "./data/LocalBoards";

export const boardsIndexAtom = atom<BoardsIndex | null>(null);
