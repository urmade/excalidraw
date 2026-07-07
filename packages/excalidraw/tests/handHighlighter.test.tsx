import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Pointer } from "./helpers/ui";
import { act, render } from "./test-utils";

describe("hand tool highlighter", () => {
  const h = window.h;
  const mouse = new Pointer("mouse");

  const getHighlighterCircle = () =>
    document.querySelector(".SVGLayer svg circle");

  const isHighlighterVisible = () => {
    const circle = getHighlighterCircle() as SVGCircleElement | null;
    return (
      !!circle &&
      h.app.handHighlighter.isActive &&
      circle.style.display !== "none"
    );
  };

  beforeEach(async () => {
    await render(<Excalidraw />);
    act(() => {
      h.app.setActiveTool({ type: "hand" });
    });
  });

  it("toggles a highlighter circle on double-click in hand mode", () => {
    expect(isHighlighterVisible()).toBe(false);

    mouse.doubleClickAt(200, 200);
    const circle = getHighlighterCircle();
    expect(isHighlighterVisible()).toBe(true);
    expect(circle?.getAttribute("cx")).toBe("200");
    expect(circle?.getAttribute("cy")).toBe("200");
    expect(h.app.handHighlighter.isActive).toBe(true);

    mouse.doubleClickAt(200, 200);
    expect(isHighlighterVisible()).toBe(false);
    expect(h.app.handHighlighter.isActive).toBe(false);
  });

  it("follows the cursor while active", () => {
    mouse.doubleClickAt(100, 100);
    expect(getHighlighterCircle()?.getAttribute("cx")).toBe("100");
    expect(getHighlighterCircle()?.getAttribute("cy")).toBe("100");

    mouse.moveTo(250, 180);
    expect(getHighlighterCircle()?.getAttribute("cx")).toBe("250");
    expect(getHighlighterCircle()?.getAttribute("cy")).toBe("180");
  });

  it("deactivates when leaving hand mode", () => {
    mouse.doubleClickAt(150, 150);
    expect(h.app.handHighlighter.isActive).toBe(true);

    act(() => {
      h.app.setActiveTool({ type: "selection" });
    });

    expect(h.app.handHighlighter.isActive).toBe(false);
    expect(isHighlighterVisible()).toBe(false);
  });

  it("keeps the user toggle active when the trail lifecycle is torn down", () => {
    mouse.doubleClickAt(150, 150);
    expect(h.app.handHighlighter.isActive).toBe(true);

    // `stop()` is the SVGLayer effect-cleanup / teardown hook. It must only
    // detach from the DOM container and must not reset the user's on/off
    // toggle, otherwise a remount or cleanup could turn the highlighter off
    // while Hand mode is still active.
    act(() => {
      h.app.handHighlighter.stop();
    });
    expect(h.app.handHighlighter.isActive).toBe(true);

    // re-binding to a container (as SVGLayer does on (re)mount) keeps it active
    act(() => {
      h.app.handHighlighter.start(
        document.querySelector(".SVGLayer svg") as SVGSVGElement,
      );
    });
    expect(h.app.handHighlighter.isActive).toBe(true);
  });

  it("does not activate when double-clicking outside hand mode", async () => {
    act(() => {
      h.app.setActiveTool({ type: "selection" });
    });

    const text = API.createElement({
      type: "text",
      x: 50,
      y: 50,
      width: 100,
      height: 25,
      text: "hello",
    });
    API.setElements([text]);

    mouse.doubleClickAt(text.x + 10, text.y + 10);

    expect(isHighlighterVisible()).toBe(false);
    expect(h.app.handHighlighter.isActive).toBe(false);
    expect(h.state.editingTextElement?.id).toBe(text.id);
  });
});
