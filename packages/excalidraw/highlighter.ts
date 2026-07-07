import { SVG_NS } from "@excalidraw/common";

import type { Trail } from "./animatedTrail";

const HIGHLIGHTER_RADIUS = 40;
const HIGHLIGHTER_STROKE_WIDTH = 3;
const HIGHLIGHTER_STROKE = "rgba(105, 101, 219, 0.85)";
const HIGHLIGHTER_FILL = "rgba(105, 101, 219, 0.08)";

export class HandHighlighter implements Trail {
  private container?: SVGSVGElement;
  private circleElement: SVGCircleElement;
  private active = false;

  constructor() {
    this.circleElement = document.createElementNS(SVG_NS, "circle");
    this.circleElement.setAttribute("r", String(HIGHLIGHTER_RADIUS));
    this.circleElement.setAttribute("stroke", HIGHLIGHTER_STROKE);
    this.circleElement.setAttribute(
      "stroke-width",
      String(HIGHLIGHTER_STROKE_WIDTH),
    );
    this.circleElement.setAttribute("fill", HIGHLIGHTER_FILL);
    this.circleElement.setAttribute("pointer-events", "none");
    this.circleElement.style.display = "none";
  }

  get isActive() {
    return this.active;
  }

  start(container?: SVGSVGElement) {
    if (container) {
      this.container = container;
    }

    if (this.container && this.circleElement.parentNode !== this.container) {
      this.container.appendChild(this.circleElement);
    }
  }

  stop() {
    // Only tear down the DOM/container binding here. Do NOT reset `active`:
    // that flag represents the user's on/off toggle and is managed separately
    // (via `toggle`/`deactivate` when leaving hand mode). Coupling teardown to
    // the toggle would let a remount/cleanup silently turn the highlighter off
    // while Hand mode is still active.
    if (this.circleElement.parentNode === this.container) {
      this.container?.removeChild(this.circleElement);
    }

    this.container = undefined;
  }

  toggle(x: number, y: number) {
    if (this.active) {
      this.deactivate();
    } else {
      this.activate(x, y);
    }
  }

  activate(x: number, y: number) {
    this.active = true;
    this.updatePosition(x, y);
    this.circleElement.style.display = "";
    this.start();
  }

  deactivate() {
    this.active = false;
    this.circleElement.style.display = "none";
  }

  updatePosition(x: number, y: number) {
    if (!this.active) {
      return;
    }

    this.circleElement.setAttribute("cx", String(x));
    this.circleElement.setAttribute("cy", String(y));
  }

  startPath(_x: number, _y: number): void {}

  addPointToPath(_x: number, _y: number): void {}

  endPath(): void {}
}
