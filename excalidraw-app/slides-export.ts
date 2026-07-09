import { SVG_DOCUMENT_PREAMBLE } from "@excalidraw/common";
import { exportToSvg } from "@excalidraw/utils/export";

import {
  getOrderedSlideFrames,
  getSlideElements,
  getSlideFrameName,
} from "@excalidraw/excalidraw/data";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

type SlideExportData = {
  frameId: string;
  title: string;
  svg: string;
  width: number;
  height: number;
};

const buildSlides = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
): Promise<SlideExportData[]> => {
  const frames = getOrderedSlideFrames(elements);

  const slides: SlideExportData[] = [];
  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index];
    const slideElements = getSlideElements(elements, frame);
    const svgElement = await exportToSvg({
      elements: slideElements,
      appState: {
        ...appState,
        exportBackground: true,
        exportEmbedScene: false,
      },
      files,
      exportingFrame: frame,
    });
    slides.push({
      frameId: frame.id,
      title: getSlideFrameName(frame, index),
      svg: SVG_DOCUMENT_PREAMBLE + svgElement.outerHTML,
      width: frame.width,
      height: frame.height,
    });
  }
  return slides;
};

export const exportSlidesToHtml = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  fileName: string,
) => {
  const slides = await buildSlides(elements, appState, files);
  if (!slides.length) {
    throw new Error("No frames found. Create at least one slide first.");
  }

  const slideMarkup = slides
    .map(
      (slide, index) => `
      <section class="slide${
        index === 0 ? " active" : ""
      }" data-index="${index}">
        <header class="slide-header">
          <span class="slide-counter">${index + 1} / ${slides.length}</span>
          <h2>${escapeHtml(slide.title)}</h2>
        </header>
        <div class="slide-body">${slide.svg}</div>
      </section>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(fileName)} Slides</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #111; color: #fff; overflow: hidden; }
    .deck { height: 100vh; width: 100vw; position: relative; }
    .slide { display: none; height: 100%; width: 100%; box-sizing: border-box; padding: 20px 24px; }
    .slide.active { display: block; }
    .slide-header { display: flex; gap: 16px; align-items: center; margin-bottom: 12px; }
    .slide-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
    .slide-counter { opacity: 0.7; font-size: 12px; min-width: 64px; }
    .slide-body { height: calc(100% - 44px); background: #fff; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .slide-body svg { width: 100%; height: 100%; display: block; }
    .controls { position: absolute; right: 16px; bottom: 16px; display: flex; gap: 8px; }
    .controls button { border: 0; border-radius: 6px; padding: 8px 12px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="deck">${slideMarkup}
    <div class="controls">
      <button id="prev">Previous</button>
      <button id="next">Next</button>
    </div>
  </div>
  <script>
    const slides = Array.from(document.querySelectorAll(".slide"));
    let active = 0;
    const render = () => {
      slides.forEach((slide, index) => slide.classList.toggle("active", index === active));
    };
    document.getElementById("prev").addEventListener("click", () => {
      active = (active - 1 + slides.length) % slides.length;
      render();
    });
    document.getElementById("next").addEventListener("click", () => {
      active = (active + 1) % slides.length;
      render();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        active = (active + 1) % slides.length;
        render();
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        active = (active - 1 + slides.length) % slides.length;
        render();
      }
    });
  </script>
</body>
</html>`;

  downloadBlob(
    new Blob([html], { type: "text/html;charset=utf-8" }),
    `${fileName}-slides.html`,
  );
};

export const exportSlidesToPdf = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  fileName: string,
) => {
  const slides = await buildSlides(elements, appState, files);
  if (!slides.length) {
    throw new Error("No frames found. Create at least one slide first.");
  }

  const printableSlides = slides
    .map(
      (slide, index) => `
      <section class="pdf-slide">
        <header>
          <h1>${escapeHtml(slide.title)}</h1>
          <p>${index + 1} / ${slides.length}</p>
        </header>
        <main>${slide.svg}</main>
      </section>
    `,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(fileName)} PDF export</title>
  <style>
    @page { margin: 0; size: landscape; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #fff; }
    .pdf-slide { page-break-after: always; width: 100vw; height: 100vh; box-sizing: border-box; padding: 24px; }
    .pdf-slide:last-child { page-break-after: auto; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    header h1 { margin: 0; font-size: 16px; }
    header p { margin: 0; font-size: 12px; color: #666; }
    main { width: calc(100vw - 48px); height: calc(100vh - 72px); border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    main svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>${printableSlides}
  <script>
    window.onload = () => {
      window.print();
    };
  </script>
</body>
</html>`;

  downloadBlob(
    new Blob([html], { type: "text/html;charset=utf-8" }),
    `${fileName}-slides-print.html`,
  );
};
