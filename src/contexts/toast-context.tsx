import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, XIcon } from "lucide-react";
import { assertContext } from "../lib/errors";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface Toast extends Required<Pick<ToastOptions, "title" | "tone">> {
  id: number;
  description?: string;
  action?: ToastOptions["action"];
}

interface ToastActions {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastActions | null>(null);

const DISMISS_AFTER_MS: Record<ToastTone, number> = {
  success: 3500,
  info: 5000,
  error: 8000,
};

const MAX_VISIBLE_TOASTS = 3;

const TONE_ICON = {
  success: <CircleCheckIcon className="size-3.5 text-status-success" />,
  error: <CircleAlertIcon className="size-3.5 text-status-error" />,
  info: <InfoIcon className="size-3.5 text-muted-foreground" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (toast: Toast) => {
      const timer = window.setTimeout(
        () => dismiss(toast.id),
        DISMISS_AFTER_MS[toast.tone],
      );
      timersRef.current.set(toast.id, timer);
    },
    [dismiss],
  );

  const showToast = useCallback(
    ({ title, description, tone = "info", action }: ToastOptions) => {
      const toast: Toast = { id: nextIdRef.current++, title, description, tone, action };
      setToasts((current) => [...current, toast].slice(-MAX_VISIBLE_TOASTS));
      scheduleDismiss(toast);
    },
    [scheduleDismiss],
  );

  const pauseDismiss = (id: number) => {
    window.clearTimeout(timersRef.current.get(id));
  };

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol
        aria-live="polite"
        className="pointer-events-none fixed bottom-12 left-1/2 z-[60] flex w-[360px] -translate-x-1/2 flex-col gap-2"
      >
        {toasts.map((toast) => (
          <li
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            onPointerEnter={() => pauseDismiss(toast.id)}
            onPointerLeave={() => scheduleDismiss(toast)}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-popover/95 px-3 py-2.5 shadow-lg backdrop-blur-md animate-slide-up-fade",
              toast.tone === "error" ? "border-status-error/30" : "border-white/10",
            )}
          >
            <span className="mt-px shrink-0">{TONE_ICON[toast.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 break-words text-[11px] leading-relaxed text-muted-foreground">
                  {toast.description}
                </p>
              )}
            </div>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-white/[0.06]"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </li>
        ))}
      </ol>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastActions {
  const context = useContext(ToastContext);
  assertContext(context, "useToast", "ToastProvider");
  return context;
}
