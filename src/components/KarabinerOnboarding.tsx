import { useEffect } from "react";
import { KarabinerOnboardingModal } from "./onboarding";
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
 * Karabiner onboarding flow shown when driver is not installed (macOS only).
 */
export function KarabinerOnboarding({ onOnboardingStateChange }: KarabinerOnboardingProps) {
  const { driverInstalled } = useKarabinerState();
  const { checkStatus } = useKarabinerActions();
  const { status } = useKanataState();
  const { openInputMonitoringSettings, start } = useKanataActions();
  const { hasProfiles, isLoading } = useConfigState();
  const { isMac } = usePlatform();
  const { showOnboarding, handleComplete } = useOnboardingFlow({
    driverInstalled,
    status,
    isLoading,
    hasProfiles,
    checkStatus,
    start,
    enabled: isMac,
  });

  // Notify parent when onboarding state changes
  useEffect(() => {
    onOnboardingStateChange(showOnboarding);
  }, [showOnboarding, onOnboardingStateChange]);

  if (!isMac) {
    return null;
  }

  return (
    <KarabinerOnboardingModal
      open={showOnboarding}
      onComplete={handleComplete}
      onOpenInputMonitoringSettings={openInputMonitoringSettings}
    />
  );
}
