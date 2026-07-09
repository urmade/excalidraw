import clsx from "clsx";
import { Popover } from "radix-ui";
import { useState } from "react";

import { LibraryIcon } from "@excalidraw/excalidraw/components/icons";
import { ToolButton } from "@excalidraw/excalidraw/components/ToolButton";
import { useTunnels } from "@excalidraw/excalidraw/context/tunnels";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { ICON_LIBRARY_ITEMS, insertIconLibraryItem } from "../iconLibrary";

import "./IconLibraryToolbar.scss";

type IconLibraryToolbarProps = {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
};

export const IconLibraryToolbar = ({
  excalidrawAPI,
}: IconLibraryToolbarProps) => {
  const { ToolbarExtrasTunnel } = useTunnels();
  const [isOpen, setIsOpen] = useState(false);

  if (!excalidrawAPI) {
    return null;
  }

  return (
    <ToolbarExtrasTunnel.In>
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <div className="icon-library-toolbar">
          <div className="App-toolbar__divider" />
          <Popover.Trigger asChild>
            <ToolButton
              type="button"
              className={clsx("Shape", "icon-library-toolbar__trigger")}
              icon={LibraryIcon}
              selected={isOpen}
              aria-label="Insert icon"
              title="Insert icon"
              data-testid="toolbar-icon-library"
            />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              sideOffset={10}
              align="start"
              className="icon-library-toolbar__content"
            >
              <div className="icon-library-toolbar__title">Icons</div>
              <div className="icon-library-toolbar__grid">
                {ICON_LIBRARY_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="icon-library-toolbar__item"
                    title={item.name}
                    aria-label={`Insert ${item.name} icon`}
                    onClick={async () => {
                      await insertIconLibraryItem(excalidrawAPI, item);
                      setIsOpen(false);
                    }}
                  >
                    <span
                      className="icon-library-toolbar__item-preview"
                      aria-hidden="true"
                      dangerouslySetInnerHTML={{ __html: item.svg }}
                    />
                    <span className="icon-library-toolbar__item-label">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </div>
      </Popover.Root>
    </ToolbarExtrasTunnel.In>
  );
};
