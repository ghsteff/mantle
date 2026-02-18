import { useCallback, useEffect, useRef, useState } from "react";
import type { KanataStatus } from "@/types";

interface UseOnboardingFlowOptions {
  driverInstalled: boolean | null;
  status: KanataStatus;
  isLoading: boolean;
  hasProfiles: boolean;
  checkStatus: () => Promise<void>;
  start: () => Promise<boolean>;
  enabled?: boolean;
}

export function useOnboardingFlow({
  driverInstalled,
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
    if (driverInstalled === false && !onboardingStarted && !onboardingCompleted) {
      setOnboardingStarted(true);
    }
  }, [driverInstalled, onboardingStarted, onboardingCompleted, enabled]);

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
      driverInstalled &&
      isServerInactive &&
      !isLoading &&
      hasProfiles &&
      !hasStartedAfterOnboardingRef.current
    ) {
      hasStartedAfterOnboardingRef.current = true;
      setTimeout(() => {
        start();
      }, 500);
    }
  }, [
    onboardingCompleted,
    driverInstalled,
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
