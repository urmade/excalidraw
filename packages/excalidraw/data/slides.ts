import {
  getElementsOverlappingFrame,
  isFrameLikeElement,
} from "@excalidraw/element";
import { newElementWith } from "@excalidraw/element";

import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement,
  NonDeleted,
} from "@excalidraw/element/types";

const SLIDE_ORDER_KEY = "presentationSlideOrder";
const AUTO_NUMBERED_SLIDE_NAME =
  /^Slide\s+\d+\s*(?::\s*(.*)|-\s*(.*))?$/i;
const GENERIC_FRAME_NAME = /^Frame$/i;

type SlideCustomData = {
  [SLIDE_ORDER_KEY]?: number;
};

export const getSlideOrder = (frame: ExcalidrawFrameLikeElement) => {
  const customData = frame.customData as SlideCustomData | undefined;
  return customData?.[SLIDE_ORDER_KEY];
};

export const getSlideFrameName = (
  frame: ExcalidrawFrameLikeElement,
  index: number,
) => {
  const title = getSlideFrameTitle(frame);
  return title ? `Slide ${index + 1}: ${title}` : `Slide ${index + 1}`;
};

export const getSlideFrameTitle = (
  frame: Pick<ExcalidrawFrameLikeElement, "name">,
) => {
  const trimmed = frame.name?.trim() || "";
  if (!trimmed || GENERIC_FRAME_NAME.test(trimmed)) {
    return "";
  }

  const numberedMatch = trimmed.match(AUTO_NUMBERED_SLIDE_NAME);
  if (!numberedMatch) {
    return trimmed;
  }

  return (numberedMatch[1] || numberedMatch[2] || "").trim();
};

const getDefaultFrameSortOrder = (
  a: ExcalidrawFrameLikeElement,
  b: ExcalidrawFrameLikeElement,
) => {
  if (a.y !== b.y) {
    return a.y - b.y;
  }
  if (a.x !== b.x) {
    return a.x - b.x;
  }
  return a.id.localeCompare(b.id);
};

export const getOrderedSlideFrames = (
  elements: readonly ExcalidrawElement[],
): NonDeleted<ExcalidrawFrameLikeElement>[] => {
  const frames = elements.filter(
    (element): element is NonDeleted<ExcalidrawFrameLikeElement> =>
      !element.isDeleted && isFrameLikeElement(element),
  );

  return [...frames].sort((a, b) => {
    const aOrder = getSlideOrder(a);
    const bOrder = getSlideOrder(b);

    if (aOrder != null && bOrder != null && aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    if (aOrder != null && bOrder == null) {
      return -1;
    }
    if (aOrder == null && bOrder != null) {
      return 1;
    }
    return getDefaultFrameSortOrder(a, b);
  });
};

export const applySlideOrderToFrames = (
  elements: readonly ExcalidrawElement[],
  orderedFrameIds: readonly ExcalidrawFrameLikeElement["id"][],
) => {
  const orderMap = new Map(orderedFrameIds.map((id, index) => [id, index]));

  return elements.map((element) => {
    if (!isFrameLikeElement(element)) {
      return element;
    }

    const nextOrder = orderMap.get(element.id);
    if (nextOrder == null) {
      return element;
    }

    const customData = (element.customData || {}) as SlideCustomData;
    const nextName = getSlideFrameName(element, nextOrder);
    if (
      customData[SLIDE_ORDER_KEY] === nextOrder &&
      element.name?.trim() === nextName
    ) {
      return element;
    }

    return newElementWith(element, {
      name: nextName,
      customData: {
        ...customData,
        [SLIDE_ORDER_KEY]: nextOrder,
      },
    });
  });
};

export const getSlideElements = (
  elements: readonly ExcalidrawElement[],
  frame: NonDeleted<ExcalidrawFrameLikeElement>,
) => {
  const elementsMap = new Map(elements.map((element) => [element.id, element]));
  return getElementsOverlappingFrame(elements, frame, elementsMap);
};
