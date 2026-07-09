import { useCallback, useMemo, useState } from "react";

import {
  ArrowRightIcon,
  playerPlayIcon,
  playerStopFilledIcon,
} from "@excalidraw/excalidraw/components/icons";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import { TextField } from "@excalidraw/excalidraw/components/TextField";

import "./SlidesMenu.scss";

type SlidesMenuProps = {
  slideCount: number;
  activeSlideIndex: number;
  isPresenting: boolean;
  onCreateBlankSlide: () => void;
  onCreateSlideFromSelection: () => void;
  onDuplicateSlide: () => void;
  onMoveSlideEarlier: () => void;
  onMoveSlideLater: () => void;
  onRenameSlide: (name: string) => void;
  onStartPresentation: () => void;
  onStopPresentation: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
};

export const SlidesMenu = ({
  slideCount,
  activeSlideIndex,
  isPresenting,
  onCreateBlankSlide,
  onCreateSlideFromSelection,
  onDuplicateSlide,
  onMoveSlideEarlier,
  onMoveSlideLater,
  onRenameSlide,
  onStartPresentation,
  onStopPresentation,
  onExportHtml,
  onExportPdf,
}: SlidesMenuProps) => {
  const [renameValue, setRenameValue] = useState("");
  const hasSlides = slideCount > 0;
  const submitRename = useCallback(() => {
    const nextName = renameValue.trim();
    if (!nextName) {
      return;
    }
    onRenameSlide(nextName);
    setRenameValue("");
  }, [onRenameSlide, renameValue]);

  const currentSlideLabel = useMemo(() => {
    if (!hasSlides || activeSlideIndex < 0) {
      return "No active slide";
    }
    return `Slide ${activeSlideIndex + 1} / ${slideCount}`;
  }, [activeSlideIndex, hasSlides, slideCount]);

  return (
    <div className="slides-menu">
      <div className="slides-menu__header">
        <h2>Slides</h2>
        <span>{currentSlideLabel}</span>
      </div>

      <div className="slides-menu__section">
        <div className="slides-menu__stack">
          <FilledButton
            variant="outlined"
            color="primary"
            size="medium"
            fullWidth
            onClick={onCreateBlankSlide}
          >
            New blank slide
          </FilledButton>
          <FilledButton
            variant="outlined"
            color="primary"
            size="medium"
            fullWidth
            onClick={onCreateSlideFromSelection}
          >
            Slide from selection
          </FilledButton>
          <FilledButton
            variant="outlined"
            color="primary"
            size="medium"
            fullWidth
            onClick={onDuplicateSlide}
            disabled={!hasSlides}
          >
            Duplicate slide
          </FilledButton>
          <div className="slides-menu__two-up">
            <FilledButton
              variant="outlined"
              color="primary"
              size="medium"
              fullWidth
              onClick={onMoveSlideEarlier}
              disabled={!hasSlides}
            >
              Move earlier
            </FilledButton>
            <FilledButton
              variant="outlined"
              color="primary"
              size="medium"
              fullWidth
              onClick={onMoveSlideLater}
              disabled={!hasSlides}
            >
              Move later
            </FilledButton>
          </div>
        </div>
      </div>

      <div className="slides-menu__section">
        <div className="slides-menu__section-label">Rename</div>
        <div className="slides-menu__rename">
          <TextField
            className="slides-menu__rename-input"
            value={renameValue}
            onChange={setRenameValue}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitRename();
              }
            }}
            placeholder="Rename active slide"
            readonly={!hasSlides}
            fullWidth
          />
          <FilledButton
            variant="filled"
            color="primary"
            size="medium"
            onClick={submitRename}
            disabled={!hasSlides || !renameValue.trim()}
          >
            Rename
          </FilledButton>
        </div>
      </div>

      <div className="slides-menu__section">
        <div className="slides-menu__section-label">Export</div>
        <div className="slides-menu__two-up">
          <FilledButton
            variant="outlined"
            color="primary"
            size="medium"
            fullWidth
            onClick={onExportHtml}
            disabled={!hasSlides}
          >
            Export HTML
          </FilledButton>
          <FilledButton
            variant="outlined"
            color="primary"
            size="medium"
            fullWidth
            onClick={onExportPdf}
            disabled={!hasSlides}
          >
            Export PDF
          </FilledButton>
        </div>
      </div>

      <div className="slides-menu__section slides-menu__section--grow">
        <div className="slides-menu__section-label">Presentation</div>
        {!isPresenting ? (
          <FilledButton
            variant="filled"
            color="primary"
            size="large"
            fullWidth
            icon={playerPlayIcon}
            onClick={onStartPresentation}
            disabled={!hasSlides}
          >
            Start presentation
          </FilledButton>
        ) : (
          <FilledButton
            variant="outlined"
            color="danger"
            size="large"
            fullWidth
            icon={playerStopFilledIcon}
            onClick={onStopPresentation}
          >
            Stop presentation
          </FilledButton>
        )}

        <p className="slides-menu__hint">
          Use <code>ArrowLeft</code> / <code>ArrowRight</code> in presentation
          mode.
        </p>
      </div>

      <a
        href="https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/slides-as-frames"
        target="_blank"
        rel="noreferrer"
        className="slides-menu__docs-link"
      >
        <FilledButton
          variant="outlined"
          color="primary"
          size="medium"
          fullWidth
          icon={ArrowRightIcon}
        >
          API docs
        </FilledButton>
      </a>
    </div>
  );
};
