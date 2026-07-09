import { applyDarkModeFilter } from "@excalidraw/common";
import {
  normalizeSVG,
  setStrokeColorOnColorizableSvg,
  STROKE_COLORIZABLE_SVG_ATTRIBUTE,
} from "@excalidraw/element";

import { ICON_LIBRARY_ITEMS } from "../iconLibrary";

describe("starter icon library", () => {
  it("defines scalable SVG starter icons", () => {
    expect(ICON_LIBRARY_ITEMS.map((item) => item.name)).toEqual([
      "Human",
      "Robot",
      "Cursor",
    ]);

    const itemIds = ICON_LIBRARY_ITEMS.map((item) => item.id);
    expect(new Set(itemIds).size).toBe(itemIds.length);

    expect(
      ICON_LIBRARY_ITEMS.every((item) => {
        const normalizedSvg = normalizeSVG(item.svg);
        return (
          normalizedSvg.includes("<svg") &&
          normalizedSvg.includes("viewBox=") &&
          normalizedSvg.includes(STROKE_COLORIZABLE_SVG_ATTRIBUTE) &&
          normalizedSvg.includes('stroke="currentColor"')
        );
      }),
    ).toBe(true);
  });

  it("updates the embedded stroke color without replacing non-stroke fills", () => {
    const nextSvg = setStrokeColorOnColorizableSvg(
      ICON_LIBRARY_ITEMS[1].svg,
      "#1971c2",
    );

    expect(nextSvg).toContain('color="#1971c2"');
    expect(nextSvg).toContain('fill="#f54e00"');
    expect(nextSvg).toContain('stroke="currentColor"');
  });

  it("can embed a dark-mode filtered stroke color", () => {
    const nextSvg = setStrokeColorOnColorizableSvg(
      ICON_LIBRARY_ITEMS[0].svg,
      applyDarkModeFilter("#000000", true),
    );

    expect(nextSvg).toContain(
      `color="${applyDarkModeFilter("#000000", true)}"`,
    );
  });
});
