import { useEffect, useMemo } from "react";
import { DriverOnboardingModal } from "./onboarding";
import {
  useConfigState,
  useKanataActions,
  useKanataState,
  useKarabinerActions,
  useKarabinerState,
} from "../contexts";
import { useOnboardingFlow } from "@/hooks/use-onboarding-flow";
import { usePlatform } from "@/hooks/use-platform";

interface KarabinerOnboardingProps {
  onOnboardingStateChange: (inProgress: boolean) => void;
}

/**
 * Driver onboarding flow shown when virtual keyboard driver is not ready (macOS only).
 * Triggers when the driver is not installed OR installed but not activated.
 */
export function KarabinerOnboarding({ onOnboardingStateChange }: KarabinerOnboardingProps) {
  const { driverInstalled, driverActivated } = useKarabinerState();
  const { checkStatus } = useKarabinerActions();
  const { status } = useKanataState();
  const { openInputMonitoringSettings, start } = useKanataActions();
  const { hasProfiles, isLoading } = useConfigState();
  const { isMac } = usePlatform();

  // Driver is "ready" only when both installed AND activated.
  // null means still checking — don't trigger onboarding yet.
  const driverReady = useMemo(() => {
    if (driverInstalled === null || driverActivated === null) return null;
    return driverInstalled && driverActivated;
  }, [driverInstalled, driverActivated]);

  const { showOnboarding, handleComplete } = useOnboardingFlow({
    driverInstalled: driverReady,
    status,
    isLoading,
    hasProfiles,
    checkStatus,
    start,
    enabled: isMac,
  });

  useEffect(() => {
    onOnboardingStateChange(showOnboarding);
  }, [showOnboarding, onOnboardingStateChange]);

  if (!isMac) {
    return null;
  }

  return (
    <DriverOnboardingModal
      open={showOnboarding}
      onComplete={handleComplete}
      onOpenInputMonitoringSettings={openInputMonitoringSettings}
    />
  );
}
