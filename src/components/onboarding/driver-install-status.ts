export function getDriverInstallStatus({
  driverInstalled,
  needsRepair,
  installedVersion,
  supportedVersion,
}: {
  driverInstalled: boolean | null;
  needsRepair: boolean;
  installedVersion: string | null;
  supportedVersion: string | null;
}) {
  if (driverInstalled === null || supportedVersion === null) {
    return { color: "bg-muted-foreground", label: "Checking..." };
  }

  if (needsRepair) {
    return {
      color: "bg-amber-500",
      label: `Incompatible (v${installedVersion ?? "unknown"}; need v${supportedVersion})`,
    };
  }

  if (driverInstalled) {
    return {
      color: "bg-status-success",
      label: `Installed (v${supportedVersion})`,
    };
  }

  return { color: "bg-muted-foreground", label: "Not installed" };
}
