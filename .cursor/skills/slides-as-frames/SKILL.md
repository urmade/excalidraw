---
name: slides-as-frames
description: Build presentation slides in Excalidraw using frame primitives.
---

# Slides as Frames

Use this skill when an agent needs to generate a slide deck directly on an Excalidraw scene.

## Contract

- Treat each slide as one `frame` element.
- Keep slide order in `frame.customData.presentationSlideOrder`.
- Keep frame children before the frame element in the scene order.

## Required steps

1. Create slides with consistent dimensions (for example `1600x900`).
2. Add slide content with `frameId` set to the corresponding frame id.
3. Reindex all slide frames with sequential order metadata (`0..n-1`).
4. Preserve frame names for title fallback.

## Recommended API surface

- `createSlide(frame)`
- `addShape`
- `addText`
- `addArrow`
- `addImage`
- `layoutInFrame`
- `exportFrame`

## Output quality checks

- Frame order metadata is sequential and unique.
- Elements intended for slide `N` use that slide's `frameId`.
- Scene stays valid when loaded through `convertToExcalidrawElements` and `updateScene`.
