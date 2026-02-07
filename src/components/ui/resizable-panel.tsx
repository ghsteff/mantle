import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useWindowEvent } from "@/hooks/use-window-event";

interface ResizablePanelProps {
  children: ReactNode;
  defaultHeight: number;
  minHeight?: number;
  maxHeight?: number;
  storageKey?: string;
  resizeHandlePosition?: "top" | "bottom";
  className?: string;
  onHeightChange?: (height: number) => void;
}

/**
 * A vertically resizable panel component with drag-to-resize functionality.
 * Supports localStorage persistence and configurable constraints.
 */
export function ResizablePanel({
  children,
  defaultHeight,
  minHeight = 100,
  maxHeight = 600,
  storageKey,
  resizeHandlePosition = "top",
  className,
  onHeightChange,
}: ResizablePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeStartYRef = useRef<number | null>(null);
  const resizeStartHeightRef = useRef<number>(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);

  const [panelHeight, setPanelHeight] = useLocalStorage<number>(
    storageKey,
    defaultHeight,
    {
      serialize: (value) => value.toString(),
      deserialize: (raw) => {
        const parsed = Number.parseInt(raw, 10);
        if (Number.isNaN(parsed)) return defaultHeight;
        return Math.max(minHeight, Math.min(maxHeight, parsed));
      },
    }
  );

  useEffect(() => {
    onHeightChange?.(panelHeight);
  }, [panelHeight, onHeightChange]);

  // Handle resize drag start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!panelRef.current) return;
      resizeStartYRef.current = e.clientY;
      resizeStartHeightRef.current = panelHeight;
      setIsResizing(true);
    },
    [panelHeight]
  );

  // Handle resize drag move
  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (resizeStartYRef.current === null || !panelRef.current) return;
      const deltaY =
        resizeHandlePosition === "top"
          ? resizeStartYRef.current - e.clientY // Dragging up increases height
          : e.clientY - resizeStartYRef.current; // Dragging down increases height
      const newHeight = Math.max(
        minHeight,
        Math.min(maxHeight, resizeStartHeightRef.current + deltaY)
      );
      setPanelHeight(newHeight);
    },
    [minHeight, maxHeight, resizeHandlePosition]
  );

  // Handle resize drag end
  const handleResizeEnd = useCallback(() => {
    resizeStartYRef.current = null;
    setIsResizing(false);
  }, []);

  const resizeEventTarget =
    typeof document !== "undefined" ? document : null;
  useWindowEvent(
    "mousemove",
    handleResizeMove,
    undefined,
    resizeEventTarget,
    isResizing
  );
  useWindowEvent(
    "mouseup",
    handleResizeEnd,
    undefined,
    resizeEventTarget,
    isResizing
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isResizing) {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      return;
    }

    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }, [isResizing]);

  return (
    <div
      ref={panelRef}
      className={cn("flex flex-col", className)}
      style={{ height: `${panelHeight}px` }}
    >
      {resizeHandlePosition === "top" && (
        <ResizeHandle
          onMouseDown={handleResizeStart}
          ariaLabel="Resize panel"
        />
      )}
      {children}
      {resizeHandlePosition === "bottom" && (
        <ResizeHandle
          onMouseDown={handleResizeStart}
          ariaLabel="Resize panel"
        />
      )}
    </div>
  );
}

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  ariaLabel?: string;
}

function ResizeHandle({ onMouseDown, ariaLabel }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="h-1 cursor-ns-resize hover:h-1.5 hover:bg-border transition-all relative group"
      role="separator"
      aria-label={ariaLabel}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-border group-hover:bg-accent transition-colors" />
    </div>
  );
}

