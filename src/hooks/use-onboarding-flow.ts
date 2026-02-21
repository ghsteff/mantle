import { useCallback, useEffect, useRef, useState } from "react";
import type { KanataStatus } from "@/types";
import type { DriverReadiness } from "@/contexts";

interface UseOnboardingFlowOptions {
  readiness: DriverReadiness;
  status: KanataStatus;
  isLoading: boolean;
  hasProfiles: boolean;
  checkStatus: () => Promise<void>;
  start: () => Promise<boolean>;
  enabled?: boolean;
}

export function useOnboardingFlow({
  readiness,
  status,
  isLoading,
  hasProfiles,
  checkStatus,
  start,
  enabled = true,
}: UseOnboardingFlowOptions) {
  const [onboardingStarted, setOnboardingStarted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const hasStartedAfterOnboardingRef = useRef(false);
  const isServerInactive = status === "idle" || status === "stopped";

  useEffect(() => {
    if (!enabled) return;
    if (readiness === "missing-driver" && !onboardingStarted && !onboardingCompleted) {
      setOnboardingStarted(true);
    }
  }, [readiness, onboardingStarted, onboardingCompleted, enabled]);

  const showOnboarding = enabled && onboardingStarted && !onboardingCompleted;

  const handleComplete = useCallback(() => {
    if (!enabled) return;
    setOnboardingCompleted(true);
    setOnboardingStarted(false);
    checkStatus();
  }, [checkStatus, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (
      onboardingCompleted &&
      readiness === "ready" &&
      isServerInactive &&
      !isLoading &&
      hasProfiles &&
      !hasStartedAfterOnboardingRef.current
    ) {
      hasStartedAfterOnboardingRef.current = true;
      const timeoutId = window.setTimeout(() => {
        start();
      }, 500);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [
    onboardingCompleted,
    readiness,
    isServerInactive,
    hasProfiles,
    isLoading,
    start,
    enabled,
  ]);

  return {
    showOnboarding,
    handleComplete,
  };
}
