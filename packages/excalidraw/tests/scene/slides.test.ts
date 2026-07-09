import { newElementWith } from "@excalidraw/element";

import { API } from "../helpers/api";
import {
  applySlideOrderToFrames,
  getOrderedSlideFrames,
  getSlideElements,
} from "../../data/slides";

describe("slides data helpers", () => {
  it("sorts frames by explicit slide order metadata", () => {
    const first = newElementWith(
      API.createElement({
        type: "frame",
        id: "frame-1",
        x: 800,
        y: 0,
      }),
      {
        customData: {
          presentationSlideOrder: 1,
        },
      },
    );
    const second = newElementWith(
      API.createElement({
        type: "frame",
        id: "frame-2",
        x: 0,
        y: 0,
      }),
      {
        customData: {
          presentationSlideOrder: 0,
        },
      },
    );

    const ordered = getOrderedSlideFrames([first, second]);
    expect(ordered.map((frame) => frame.id)).toEqual(["frame-2", "frame-1"]);
  });

  it("writes stable sequential frame order metadata", () => {
    const first = newElementWith(
      API.createElement({
        type: "frame",
        id: "frame-1",
      }),
      {
        name: "Frame",
      },
    );
    const second = newElementWith(
      API.createElement({
        type: "frame",
        id: "frame-2",
      }),
      {
        name: "Intro",
      },
    );

    const updated = applySlideOrderToFrames(
      [first, second],
      ["frame-2", "frame-1"],
    );
    const updatedSecond = updated.find((element) => element.id === "frame-2")!;
    const updatedFirst = updated.find((element) => element.id === "frame-1")!;

    expect(updatedSecond.customData?.presentationSlideOrder).toBe(0);
    expect(updatedFirst.customData?.presentationSlideOrder).toBe(1);
    expect("name" in updatedSecond && updatedSecond.name).toBe("Slide 1: Intro");
    expect("name" in updatedFirst && updatedFirst.name).toBe("Slide 2");
  });

  it("renumbers auto-numbered slide titles when the order changes", () => {
    const first = newElementWith(
      API.createElement({
        type: "frame",
        id: "frame-1",
      }),
      {
        name: "Slide 1: Intro",
      },
    );
    const second = newElementWith(
      API.createElement({
        type: "frame",
        id: "frame-2",
      }),
      {
        name: "Slide 2: Demo",
      },
    );

    const updated = applySlideOrderToFrames(
      [first, second],
      ["frame-2", "frame-1"],
    );

    const updatedSecond = updated.find((element) => element.id === "frame-2")!;
    const updatedFirst = updated.find((element) => element.id === "frame-1")!;

    expect("name" in updatedSecond && updatedSecond.name).toBe("Slide 1: Demo");
    expect("name" in updatedFirst && updatedFirst.name).toBe("Slide 2: Intro");
  });

  it("collects frame descendants for per-slide export", () => {
    const frame = API.createElement({
      type: "frame",
      id: "frame-export",
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    const child = API.createElement({
      id: "child-in-frame",
      x: 20,
      y: 20,
      frameId: frame.id,
    });
    const outsider = API.createElement({
      id: "child-outside-frame",
      x: 600,
      y: 600,
    });

    const slideElements = getSlideElements([child, frame, outsider], frame);
    expect(slideElements.map((element) => element.id)).toContain(
      "child-in-frame",
    );
    expect(slideElements.map((element) => element.id)).not.toContain(
      "child-outside-frame",
    );
  });
});
