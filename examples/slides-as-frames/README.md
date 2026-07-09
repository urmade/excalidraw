# Slides as Frames Example

This example shows the minimal structure for building a deck with Excalidraw primitives.

## Invariants

- Keep one `frame` per slide.
- Assign `frameId` to slide content.
- Maintain sequential `customData.presentationSlideOrder`.

## Skeleton snippet

```ts
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

export const deckElements = convertToExcalidrawElements([
  {
    type: "rectangle",
    id: "card-1",
    x: 120,
    y: 160,
    width: 500,
    height: 220,
    frameId: "slide-1",
  },
  { type: "text", x: 160, y: 210, text: "Slide 1", frameId: "slide-1" },
  {
    type: "frame",
    id: "slide-1",
    name: "Intro",
    x: 60,
    y: 100,
    width: 1280,
    height: 720,
    children: ["card-1"],
    customData: { presentationSlideOrder: 0 },
  },
]);
```
