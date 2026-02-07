import { useEffect, useRef } from "react";
import {
  useConfigState,
  useKanataActions,
  useKanataState,
  useKarabinerState,
} from "../contexts";

interface AutoStartServerProps {
  onboardingInProgress: boolean;
}

/**
 * Auto-start the Kanata server on app boot if conditions are met.
 */
export function AutoStartServer({ onboardingInProgress }: AutoStartServerProps) {
  const { driverInstalled } = useKarabinerState();
  const { status } = useKanataState();
  const { start } = useKanataActions();
  const { hasProfiles, isLoading } = useConfigState();
  const hasAttemptedStartRef = useRef(false);

  useEffect(() => {
    // Only auto-start once per app session
    if (hasAttemptedStartRef.current) {
      return;
    }

    // Don't auto-start if onboarding is in progress
    if (onboardingInProgress) {
      return;
    }

    // Check if we should auto-start:
    // 1. Driver is installed (null means still checking, false means not installed)
    // 2. Server is stopped
    // 3. Config is loaded and has profiles
    // 4. We haven't tried starting yet
    // 5. Onboarding is not in progress
    if (
      driverInstalled === true &&
      status === "stopped" &&
      !isLoading &&
      hasProfiles
    ) {
      hasAttemptedStartRef.current = true;
      // Start immediately - no delay needed since all conditions are met
      start();
    }
  }, [driverInstalled, status, hasProfiles, isLoading, onboardingInProgress, start]);

  return null;
}
