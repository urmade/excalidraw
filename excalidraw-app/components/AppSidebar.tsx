import { DefaultSidebar, Sidebar, THEME } from "@excalidraw/excalidraw";
import {
  gridIcon,
  messageCircleIcon,
  presentationIcon,
} from "@excalidraw/excalidraw/components/icons";
import { LinkButton } from "@excalidraw/excalidraw/components/LinkButton";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { BoardsMenu } from "./BoardsMenu";
import { SlidesMenu } from "./SlidesMenu";

import "./AppSidebar.scss";

type AppSidebarProps = {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  onCreateBoard: () => Promise<void>;
  onSwitchBoard: (boardId: string) => Promise<void>;
  onRenameBoard: (boardId: string, title: string) => Promise<void>;
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
  onExportSlidesHtml: () => void;
  onExportSlidesPdf: () => void;
};

export const AppSidebar = ({
  excalidrawAPI,
  onCreateBoard,
  onSwitchBoard,
  onRenameBoard,
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
  onExportSlidesHtml,
  onExportSlidesPdf,
}: AppSidebarProps) => {
  const { theme, openSidebar } = useUIAppState();

  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab="boards"
          style={{ opacity: openSidebar?.tab === "boards" ? 1 : 0.4 }}
        >
          {gridIcon}
        </Sidebar.TabTrigger>
        <Sidebar.TabTrigger
          tab="comments"
          style={{ opacity: openSidebar?.tab === "comments" ? 1 : 0.4 }}
        >
          {messageCircleIcon}
        </Sidebar.TabTrigger>
        <Sidebar.TabTrigger
          tab="slides"
          style={{ opacity: openSidebar?.tab === "slides" ? 1 : 0.4 }}
        >
          {presentationIcon}
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="boards">
        {excalidrawAPI ? (
          <BoardsMenu
            onCreateBoard={onCreateBoard}
            onSwitchBoard={onSwitchBoard}
            onRenameBoard={onRenameBoard}
          />
        ) : null}
      </Sidebar.Tab>
      <Sidebar.Tab tab="comments">
        <div className="app-sidebar-promo-container">
          <div
            className="app-sidebar-promo-image"
            style={{
              ["--image-source" as any]: `url(/oss_promo_comments_${
                theme === THEME.DARK ? "dark" : "light"
              }.jpg)`,
              opacity: 0.7,
            }}
          />
          <div className="app-sidebar-promo-text">
            Make comments with Excalidraw+
          </div>
          <LinkButton
            href={`${
              import.meta.env.VITE_APP_PLUS_LP
            }/plus?utm_source=excalidraw&utm_medium=app&utm_content=comments_promo#excalidraw-redirect`}
          >
            Sign up now
          </LinkButton>
        </div>
      </Sidebar.Tab>
      <Sidebar.Tab tab="slides" className="px-3">
        <SlidesMenu
          slideCount={slideCount}
          activeSlideIndex={activeSlideIndex}
          isPresenting={isPresenting}
          onCreateBlankSlide={onCreateBlankSlide}
          onCreateSlideFromSelection={onCreateSlideFromSelection}
          onDuplicateSlide={onDuplicateSlide}
          onMoveSlideEarlier={onMoveSlideEarlier}
          onMoveSlideLater={onMoveSlideLater}
          onRenameSlide={onRenameSlide}
          onStartPresentation={onStartPresentation}
          onStopPresentation={onStopPresentation}
          onExportHtml={onExportSlidesHtml}
          onExportPdf={onExportSlidesPdf}
        />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
