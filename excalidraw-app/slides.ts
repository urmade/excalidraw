import {
  CaptureUpdateAction,
  addElementsToFrame,
  duplicateElements,
  getCommonBounds,
  isFrameLikeElement,
  newElementWith,
  newFrameElement,
} from "@excalidraw/element";
import {
  applySlideOrderToFrames,
  getOrderedSlideFrames,
  getSlideElements,
  getSlideFrameTitle,
} from "@excalidraw/excalidraw/data";

import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const SLIDE_GAP = 96;
const FRAME_PADDING = 24;
const DEFAULT_SLIDE_WIDTH = 1600;
const DEFAULT_SLIDE_HEIGHT = 900;

export const getSlideDeck = (elements: readonly ExcalidrawElement[]) => {
  const frames = getOrderedSlideFrames(elements);
  return {
    frames,
    frameIds: frames.map((frame) => frame.id),
  };
};

const getActiveFrame = (
  api: ExcalidrawImperativeAPI,
  preferredFrameId: ExcalidrawFrameLikeElement["id"] | null = null,
) => {
  const elements = api.getSceneElements();
  const { frames } = getSlideDeck(elements);
  if (!frames.length) {
    return null;
  }

  if (preferredFrameId) {
    const preferred = frames.find((frame) => frame.id === preferredFrameId);
    if (preferred) {
      return preferred;
    }
  }

  const selectedIds = api.getAppState().selectedElementIds;
  const selectedFrame = frames.find((frame) => selectedIds[frame.id]);
  return selectedFrame || frames[0];
};

const getNextSlidePosition = (
  frames: readonly ExcalidrawFrameLikeElement[],
) => {
  if (!frames.length) {
    return { x: 0, y: 0 };
  }

  const rightMost = frames.reduce((acc, frame) =>
    frame.x + frame.width > acc.x + acc.width ? frame : acc,
  );
  return {
    x: rightMost.x + rightMost.width + SLIDE_GAP,
    y: rightMost.y,
  };
};

export const createBlankSlide = (api: ExcalidrawImperativeAPI) => {
  const elements = api.getSceneElementsIncludingDeleted();
  const { frames, frameIds } = getSlideDeck(elements);
  const nextPosition = getNextSlidePosition(frames);
  const frame = newFrameElement({
    x: nextPosition.x,
    y: nextPosition.y,
    width: DEFAULT_SLIDE_WIDTH,
    height: DEFAULT_SLIDE_HEIGHT,
  });

  const nextElements = [...elements, frame];
  const nextOrderedIds = [...frameIds, frame.id];

  api.updateScene({
    elements: applySlideOrderToFrames(nextElements, nextOrderedIds),
    appState: {
      selectedElementIds: {
        [frame.id]: true,
      },
      name: api.getAppState().name || "Untitled",
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  return frame.id;
};

export const createSlideFromSelection = (api: ExcalidrawImperativeAPI) => {
  const elements = api.getSceneElementsIncludingDeleted();
  const appState = api.getAppState();
  const selected = elements.filter(
    (element) =>
      appState.selectedElementIds[element.id] && !isFrameLikeElement(element),
  ) as NonDeletedExcalidrawElement[];

  if (!selected.length) {
    return createBlankSlide(api);
  }

  const [x1, y1, x2, y2] = getCommonBounds(
    selected,
    new Map(elements.map((el) => [el.id, el])),
  );
  const frame = newFrameElement({
    x: x1 - FRAME_PADDING,
    y: y1 - FRAME_PADDING,
    width: x2 - x1 + FRAME_PADDING * 2,
    height: y2 - y1 + FRAME_PADDING * 2,
  });

  const nextElements = addElementsToFrame(
    [...elements, frame],
    selected,
    frame,
  );
  const { frameIds } = getSlideDeck(nextElements);
  const nextFrameIds = frameIds.includes(frame.id)
    ? frameIds
    : [...frameIds, frame.id];

  api.updateScene({
    elements: applySlideOrderToFrames(nextElements, nextFrameIds),
    appState: {
      selectedElementIds: {
        [frame.id]: true,
      },
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  return frame.id;
};

export const duplicateSlide = (
  api: ExcalidrawImperativeAPI,
  preferredFrameId: ExcalidrawFrameLikeElement["id"] | null = null,
) => {
  const elements = api.getSceneElementsIncludingDeleted();
  const activeFrame = getActiveFrame(api, preferredFrameId);
  if (!activeFrame) {
    return null;
  }

  const sourceElements = [
    ...getSlideElements(elements, activeFrame),
    activeFrame,
  ];
  const { duplicatedElements, origIdToDuplicateId } = duplicateElements({
    type: "everything",
    elements: sourceElements,
    preserveFrameChildrenOrder: true,
  });

  const duplicateFrameId = origIdToDuplicateId.get(activeFrame.id);
  const offsetX = activeFrame.width + SLIDE_GAP;
  const movedDuplicates = duplicatedElements.map((element) => {
    const next = newElementWith(element, {
      x: element.x + offsetX,
      y: element.y,
    });
    if (element.id === duplicateFrameId && isFrameLikeElement(next)) {
      const duplicateTitle = getSlideFrameTitle(activeFrame);
      return newElementWith(next, {
        name: duplicateTitle ? `${duplicateTitle} copy` : "Copy",
      });
    }
    return next;
  });

  const mergedElements = [...elements, ...movedDuplicates];
  const { frameIds } = getSlideDeck(elements);
  const sourceIndex = frameIds.findIndex((id) => id === activeFrame.id);
  const nextFrameIds = [...frameIds];
  if (duplicateFrameId) {
    nextFrameIds.splice(sourceIndex + 1, 0, duplicateFrameId);
  }

  api.updateScene({
    elements: applySlideOrderToFrames(mergedElements, nextFrameIds),
    appState: duplicateFrameId
      ? {
          selectedElementIds: {
            [duplicateFrameId]: true,
          },
        }
      : undefined,
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  return duplicateFrameId || null;
};

export const moveSlide = (
  api: ExcalidrawImperativeAPI,
  direction: "previous" | "next",
  preferredFrameId: ExcalidrawFrameLikeElement["id"] | null = null,
) => {
  const elements = api.getSceneElementsIncludingDeleted();
  const activeFrame = getActiveFrame(api, preferredFrameId);
  if (!activeFrame) {
    return null;
  }

  const { frameIds } = getSlideDeck(elements);
  const index = frameIds.findIndex((id) => id === activeFrame.id);
  const targetIndex = direction === "previous" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= frameIds.length) {
    return activeFrame.id;
  }

  const nextFrameIds = [...frameIds];
  [nextFrameIds[index], nextFrameIds[targetIndex]] = [
    nextFrameIds[targetIndex],
    nextFrameIds[index],
  ];

  api.updateScene({
    elements: applySlideOrderToFrames(elements, nextFrameIds),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  return activeFrame.id;
};

export const renameActiveSlide = (
  api: ExcalidrawImperativeAPI,
  name: string,
  preferredFrameId: ExcalidrawFrameLikeElement["id"] | null = null,
) => {
  const elements = api.getSceneElementsIncludingDeleted();
  const activeFrame = getActiveFrame(api, preferredFrameId);
  if (!activeFrame) {
    return null;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }

  const { frameIds } = getSlideDeck(elements);
  const renamedElements = elements.map((element) =>
    element.id === activeFrame.id && isFrameLikeElement(element)
      ? newElementWith(element, { name: trimmed })
      : element,
  );

  api.updateScene({
    elements: applySlideOrderToFrames(renamedElements, frameIds),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  return activeFrame.id;
};
