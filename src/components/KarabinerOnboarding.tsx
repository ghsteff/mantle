import { useCallback, useEffect, useRef, useState } from "react";
import { KarabinerOnboardingModal } from "./onboarding";
import {
  useConfigState,
  useKanataActions,
  useKanataState,
  useKarabinerActions,
  useKarabinerState,
} from "../contexts";

interface KarabinerOnboardingProps {
  onOnboardingStateChange: (inProgress: boolean) => void;
}

/**
 * Karabiner onboarding flow shown when driver is not installed (macOS only).
 */
export function KarabinerOnboarding({ onOnboardingStateChange }: KarabinerOnboardingProps) {
  const { driverInstalled } = useKarabinerState();
  const { checkStatus } = useKarabinerActions();
  const { status } = useKanataState();
  const { openInputMonitoringSettings, start } = useKanataActions();
  const { hasProfiles, isLoading } = useConfigState();
  const [onboardingStarted, setOnboardingStarted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Start onboarding when driver is not installed
  useEffect(() => {
    if (driverInstalled === false && !onboardingStarted && !onboardingCompleted) {
      setOnboardingStarted(true);
    }
  }, [driverInstalled, onboardingStarted, onboardingCompleted]);

  // Keep modal open once started, until user clicks "Done"
  const showOnboarding = onboardingStarted && !onboardingCompleted;

  // Notify parent when onboarding state changes
  useEffect(() => {
    onOnboardingStateChange(showOnboarding);
  }, [showOnboarding, onOnboardingStateChange]);

  const handleComplete = useCallback(() => {
    setOnboardingCompleted(true);
    setOnboardingStarted(false);
    // Re-check status in case user completed installation
    checkStatus();
  }, [checkStatus]);

  // Auto-start server after onboarding is completed
  const hasStartedAfterOnboardingRef = useRef(false);

  useEffect(() => {
    if (
      onboardingCompleted &&
      driverInstalled &&
      status === "stopped" &&
      !isLoading &&
      hasProfiles &&
      !hasStartedAfterOnboardingRef.current
    ) {
      hasStartedAfterOnboardingRef.current = true;
      // Small delay to let the user see the UI before starting
      setTimeout(() => {
        start();
      }, 500);
    }
  }, [onboardingCompleted, driverInstalled, status, hasProfiles, isLoading, start]);

  return (
    <KarabinerOnboardingModal
      open={showOnboarding}
      onComplete={handleComplete}
      onOpenInputMonitoringSettings={openInputMonitoringSettings}
    />
  );
}
