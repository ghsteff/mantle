import { useMemo } from "react";

interface PlatformInfo {
  platform: string;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
}

export function usePlatform(): PlatformInfo {
  const platform = useMemo(() => {
    if (typeof navigator === "undefined") return "unknown";

    const navigatorWithUA = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };

    return (
      navigatorWithUA.userAgentData?.platform ||
      navigator.platform ||
      "unknown"
    );
  }, []);

  return useMemo(() => {
    const lower = platform.toLowerCase();
    return {
      platform,
      isMac: lower.includes("mac"),
      isWindows: lower.includes("win"),
      isLinux: lower.includes("linux"),
    };
  }, [platform]);
}
