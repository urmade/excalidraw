import { useEffect, useRef } from "react";

import "./HandToolSpotlight.scss";

type HandToolSpotlightProps = {
  active: boolean;
  initialPosition: { x: number; y: number };
};

const getTransform = (x: number, y: number) =>
  `translate(${x}px, ${y}px) translate(-50%, -50%)`;

export const HandToolSpotlight = ({
  active,
  initialPosition,
}: HandToolSpotlightProps) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active || !spotlightRef.current) {
      return;
    }

    const spotlight = spotlightRef.current;
    const updatePosition = (x: number, y: number) => {
      spotlight.style.transform = getTransform(x, y);
    };

    updatePosition(initialPosition.x, initialPosition.y);

    const onPointerMove = (event: PointerEvent) => {
      updatePosition(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", onPointerMove);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [active, initialPosition.x, initialPosition.y]);

  if (!active) {
    return null;
  }

  return (
    <div className="HandToolSpotlight">
      <div
        ref={spotlightRef}
        className="HandToolSpotlight__circle"
        style={{
          transform: getTransform(
            initialPosition.x,
            initialPosition.y,
          ),
        }}
      />
    </div>
  );
};
