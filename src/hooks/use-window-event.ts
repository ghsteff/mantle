import { useEffect, useRef } from "react";

export function useWindowEvent(
  eventName: string,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions,
  target?: EventTarget | null,
  enabled = true
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const eventTarget =
      target ?? (typeof window !== "undefined" ? window : null);

    if (!eventTarget?.addEventListener) return;

    const listener = (event: Event) => savedHandler.current(event);
    eventTarget.addEventListener(eventName, listener, options);
    return () => {
      eventTarget.removeEventListener(eventName, listener, options);
    };
  }, [eventName, options, target, enabled]);
}
