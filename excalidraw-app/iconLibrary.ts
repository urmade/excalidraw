import { applyDarkModeFilter, MIME_TYPES, THEME } from "@excalidraw/common";
import {
  newImageElement,
  normalizeSVG,
  setStrokeColorOnColorizableSvg,
  STROKE_COLORIZABLE_SVG_ATTRIBUTE,
  syncInvalidIndices,
} from "@excalidraw/element";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import {
  SVGStringToFile,
  generateIdFromFile,
  getDataURL,
} from "@excalidraw/excalidraw/data/blob";

import type {
  BinaryFileData,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

const DEFAULT_ICON_INSERT_SIZE = 112;
const DEFAULT_ICON_DIMENSION = 64;

const getThemeAwareStrokeColor = (strokeColor: string, isDarkMode: boolean) =>
  applyDarkModeFilter(strokeColor, isDarkMode);

const createColorizableIconSvg = (
  svg: string,
  strokeColor: string,
  isDarkMode: boolean,
) =>
  setStrokeColorOnColorizableSvg(
    normalizeSVG(svg),
    getThemeAwareStrokeColor(strokeColor, isDarkMode),
  );

export type IconLibraryItem = {
  id: string;
  name: string;
  svg: string;
};

const getSvgDimensions = (svg: string) => {
  const document = new DOMParser().parseFromString(svg, MIME_TYPES.svg);
  const element = document.querySelector("svg");
  const viewBox = element?.getAttribute("viewBox")?.trim().split(/\s+/) ?? [];
  const widthFromViewBox = Number(viewBox[2]);
  const heightFromViewBox = Number(viewBox[3]);
  const widthFromAttribute = Number(element?.getAttribute("width"));
  const heightFromAttribute = Number(element?.getAttribute("height"));

  const width =
    widthFromViewBox || widthFromAttribute || DEFAULT_ICON_DIMENSION;
  const height =
    heightFromViewBox || heightFromAttribute || DEFAULT_ICON_DIMENSION;

  return {
    width,
    height,
  };
};

const getViewportCenter = (excalidrawAPI: ExcalidrawImperativeAPI) => {
  const appState = excalidrawAPI.getAppState();

  return {
    x: appState.width / 2 / appState.zoom.value - appState.scrollX,
    y: appState.height / 2 / appState.zoom.value - appState.scrollY,
  };
};

export const ICON_LIBRARY_ITEMS: readonly IconLibraryItem[] = [
  {
    id: "human",
    name: "Human",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" color="#26251e" ${STROKE_COLORIZABLE_SVG_ATTRIBUTE}="true">
  <circle cx="32" cy="11" r="7" stroke="currentColor" stroke-width="4"/>
  <path d="M32 18v18" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path d="M18 29l14-6 14 6" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M24 54l8-18 8 18" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  },
  {
    id: "robot",
    name: "Robot",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" color="#26251e" ${STROKE_COLORIZABLE_SVG_ATTRIBUTE}="true">
  <path d="M32 7v6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <circle cx="32" cy="5" r="2.5" fill="#f54e00"/>
  <rect x="12" y="14" width="40" height="22" rx="6" fill="#f2f1ed" stroke="currentColor" stroke-width="4"/>
  <circle cx="25" cy="25" r="3" fill="#f54e00"/>
  <circle cx="39" cy="25" r="3" fill="#f54e00"/>
  <path d="M24 32h16" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <rect x="18" y="40" width="28" height="14" rx="4" fill="#f2f1ed" stroke="currentColor" stroke-width="4"/>
  <path d="M18 44l-8 6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path d="M46 44l8 6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path d="M26 54l-3 8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path d="M38 54l3 8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
</svg>`,
  },
  {
    id: "cursor",
    name: "Cursor",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" color="#edecec" ${STROKE_COLORIZABLE_SVG_ATTRIBUTE}="true">
  <rect width="64" height="64" rx="16" fill="#14120b"/>
  <path d="M32 13l19 19-19 19-19-19 19-19Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
  <path d="M32 24l8 8-8 8-8-8 8-8Z" fill="#f54e00"/>
  <path d="M23 41l18-18" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
</svg>`,
  },
] as const;

export const insertIconLibraryItem = async (
  excalidrawAPI: ExcalidrawImperativeAPI,
  item: IconLibraryItem,
) => {
  const appState = excalidrawAPI.getAppState();
  const strokeColor = appState.currentItemStrokeColor;
  const normalizedSvg = createColorizableIconSvg(
    item.svg,
    strokeColor,
    appState.theme === THEME.DARK,
  );
  const file = SVGStringToFile(normalizedSvg, `${item.id}.svg`);
  const fileId = await generateIdFromFile(file);
  const dataURL = await getDataURL(file);
  const { width: naturalWidth, height: naturalHeight } =
    getSvgDimensions(normalizedSvg);
  const scale =
    DEFAULT_ICON_INSERT_SIZE / Math.max(naturalWidth, naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const center = getViewportCenter(excalidrawAPI);
  const imageElement = {
    ...newImageElement({
      type: "image",
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      fileId,
      status: "saved",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      locked: false,
    }),
    strokeColor,
  };

  const nextElements = [
    ...excalidrawAPI.getSceneElementsIncludingDeleted(),
    imageElement,
  ];
  syncInvalidIndices(nextElements);

  const fileData: BinaryFileData = {
    id: fileId,
    mimeType: MIME_TYPES.svg,
    dataURL,
    created: Date.now(),
    lastRetrieved: Date.now(),
  };

  excalidrawAPI.addFiles([fileData]);
  excalidrawAPI.updateScene({
    elements: nextElements,
    appState: {
      selectedElementIds: { [imageElement.id]: true },
      selectedGroupIds: {},
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
};
