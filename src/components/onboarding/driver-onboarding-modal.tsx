import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";
import { Dialog, DialogContent } from "../ui/dialog";
import { cn } from "../../lib/utils";
import { useKarabinerActions, useKarabinerState } from "../../contexts";
import { getDriverInstallStatus } from "./driver-install-status";

type OnboardingStep = "install" | "approve" | "permission";

interface DriverOnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onOpenInputMonitoringSettings: () => void;
}

const APPROVAL_POLL_INTERVAL_MS = 3000;

function stepMeta(
  step: OnboardingStep,
  supportedVersion: string | null
): { number: string; title: string; description: string } {
  switch (step) {
    case "install":
      return {
        number: "01",
        title: "INSTALL VIRTUAL KEYBOARD DRIVER",
        description: supportedVersion
          ? `Mantle needs Karabiner VirtualHIDDevice v${supportedVersion} to intercept and remap your keys.`
          : "Mantle needs a virtual keyboard driver to intercept and remap your keys.",
      };
    case "approve":
      return {
        number: "02",
        title: "APPROVE SYSTEM EXTENSION",
        description:
          "macOS requires you to approve the virtual keyboard driver before it can run. This is a one-time step.",
      };
    case "permission":
      return {
        number: "03",
        title: "GRANT INPUT MONITORING",
        description:
          "Grant Kanata permission to monitor keyboard input so remappings can take effect.",
      };
  }
}

export function DriverOnboardingModal({
  open,
  onComplete,
  onOpenInputMonitoringSettings,
}: DriverOnboardingModalProps) {
  const {
    readiness,
    status,
    installFlow,
  } = useKarabinerState();
  const {
    startInstall,
    cancelInstall,
    checkStatus,
    activateDriver,
    openExtensionSettings,
  } = useKarabinerActions();

  const [step, setStep] = useState<OnboardingStep>("install");
  const terminalRef = useRef<HTMLDivElement>(null);
  const checkStatusTimeoutRef = useRef<number | null>(null);
  const driverInstalled = status?.driverInstalled ?? null;
  const driverActivated = status?.driverActivated ?? null;
  const driverPendingApproval = status?.driverPendingApproval ?? null;
  const installedVersion = status?.installedVersion ?? null;
  const supportedVersion = status?.supportedVersion ?? null;
  const versionCompatible = status?.versionCompatible ?? null;
  const needsRepair = readiness === "incompatible-driver";
  const driverReady = Boolean(driverInstalled) && !needsRepair;
  const isInstalling = installFlow.status === "installing";
  const installFailed = installFlow.status === "error";
  const installSucceeded = installFlow.status === "success";
  const installOutput = installFlow.output;
  const installError = installFlow.status === "error" ? installFlow.error : null;
  const canProceed = installSucceeded || driverReady;

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [installOutput]);

  useEffect(() => {
    return () => {
      if (checkStatusTimeoutRef.current !== null) {
        window.clearTimeout(checkStatusTimeoutRef.current);
      }
    };
  }, []);

  // Determine the correct starting step based on current state
  useEffect(() => {
    if (open) {
      checkStatus();
    }
  }, [open, checkStatus]);

  // Route to the correct step whenever state changes
  useEffect(() => {
    if (!open) return;

    if (readiness === "ready") {
      setStep("permission");
    } else if (readiness === "awaiting-approval") {
      setStep("approve");
    } else {
      // missing-driver and incompatible-driver both use the install/repair step
      setStep("install");
    }
  }, [open, readiness]);

  // After install succeeds, re-check to pick up the new state
  useEffect(() => {
    if (installFlow.status === "success") {
      checkStatus();
    }
  }, [installFlow.status, checkStatus]);

  // Poll for approval while on the approve step
  useEffect(() => {
    if (step !== "approve") return;

    const interval = setInterval(() => {
      checkStatus();
    }, APPROVAL_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [step, checkStatus]);

  // Auto-advance when approval is detected
  useEffect(() => {
    if (step === "approve" && readiness === "ready") {
      setStep("permission");
    }
  }, [step, readiness]);

  const handleInstall = () => {
    startInstall();
  };

  const handleCancel = () => {
    cancelInstall();
  };

  const handleOpenExtensionSettings = () => {
    openExtensionSettings();
  };

  const handleRetryActivation = async () => {
    await activateDriver();
    if (checkStatusTimeoutRef.current !== null) {
      window.clearTimeout(checkStatusTimeoutRef.current);
    }
    checkStatusTimeoutRef.current = window.setTimeout(() => {
      checkStatus();
    }, 2000);
  };

  const handleNext = () => {
    if (step === "install" && driverInstalled && versionCompatible !== false) {
      setStep(driverActivated ? "permission" : "approve");
    } else if (step === "approve" && driverActivated) {
      setStep("permission");
    }
  };

  const handleOpenSettings = () => {
    onOpenInputMonitoringSettings();
  };

  const handleDone = () => {
    onComplete();
  };

  const currentStep = stepMeta(step, supportedVersion);

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-background border-border rounded-none shadow-none flex flex-col overflow-hidden"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-card select-none">
          <div className="flex items-center gap-4">
            <div className="size-3 bg-primary" />
            <h1 className="font-mono text-sm font-bold tracking-wider uppercase text-foreground">
              System Setup
            </h1>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Step {currentStep.number} / 03
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-6 border-b border-border bg-background">
            <h2 className="font-mono text-lg font-bold text-foreground mb-2">
              {currentStep.title}
            </h2>
            <p className="font-mono text-xs text-muted-foreground max-w-xl">
              {currentStep.description}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto bg-secondary p-6">
            {step === "install" ? (
              <InstallStepContent
                driverInstalled={driverInstalled}
                needsRepair={needsRepair}
                canProceed={canProceed}
                installedVersion={installedVersion}
                supportedVersion={supportedVersion}
                isInstalling={isInstalling}
                installFailed={installFailed}
                installSucceeded={installSucceeded}
                installOutput={installOutput}
                installError={installError}
                terminalRef={terminalRef}
              />
            ) : step === "approve" ? (
              <ApproveStepContent
                driverActivated={driverActivated}
                driverPendingApproval={driverPendingApproval}
              />
            ) : (
              <PermissionStepContent />
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-card flex items-center justify-between">
            <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
              {step === "install" && isInstalling && "Installing..."}
              {step === "install" && installFailed && "Installation failed"}
              {step === "install" && installSucceeded && "Driver installed"}
              {step === "approve" && driverActivated && "Extension approved"}
              {step === "approve" && !driverActivated && (
                <span className="size-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === "install" ? (
                <InstallStepFooter
                  isInstalling={isInstalling}
                  installFailed={installFailed}
                  canProceed={canProceed}
                  needsRepair={needsRepair}
                  onInstall={handleInstall}
                  onCancel={handleCancel}
                  onNext={handleNext}
                />
              ) : step === "approve" ? (
                <ApproveStepFooter
                  driverActivated={driverActivated}
                  onOpenSettings={handleOpenExtensionSettings}
                  onRetryActivation={handleRetryActivation}
                  onNext={handleNext}
                />
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDone}
                    className="font-mono text-xs rounded-none border-border hover:bg-secondary"
                  >
                    DONE
                  </Button>
                  <Button
                    onClick={handleOpenSettings}
                    className={cn(
                      "font-mono text-xs rounded-none min-w-32 tracking-wide",
                      "bg-foreground text-background hover:bg-foreground/90"
                    )}
                  >
                    OPEN SYSTEM SETTINGS
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InstallStepContent({
  driverInstalled,
  needsRepair,
  canProceed,
  installedVersion,
  supportedVersion,
  isInstalling,
  installFailed,
  installSucceeded,
  installOutput,
  installError,
  terminalRef,
}: {
  driverInstalled: boolean | null;
  needsRepair: boolean;
  canProceed: boolean;
  installedVersion: string | null;
  supportedVersion: string | null;
  isInstalling: boolean;
  installFailed: boolean;
  installSucceeded: boolean;
  installOutput: string[];
  installError: string | null;
  terminalRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { color, label } = getDriverInstallStatus({
    driverInstalled,
    needsRepair,
    installedVersion,
    supportedVersion,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", color)} />
          <span className="text-text-secondary">Virtual Keyboard Driver: {label}</span>
        </div>
      </div>

      {(isInstalling || installOutput.length > 0) && (
        <div
          ref={terminalRef}
          className="bg-background border border-border p-3 font-mono text-xs h-64 overflow-y-auto"
        >
          {installOutput.map((line, i) => (
            <div key={i} className="text-text-secondary whitespace-pre-wrap">
              {line}
            </div>
          ))}
          {isInstalling && (
            <div className="text-primary animate-pulse">_</div>
          )}
        </div>
      )}

      {installFailed && installError && (
        <div className="bg-status-error/10 border border-status-error/30 p-3 font-mono text-xs text-status-error">
          {installError}
        </div>
      )}

      {needsRepair && !isInstalling && !installSucceeded && supportedVersion && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 font-mono text-xs text-amber-700 dark:text-amber-400">
          Installed driver v{installedVersion ?? "unknown"} does not match Mantle&apos;s
          required v{supportedVersion}. Repair installs the compatible driver. If
          Karabiner-Elements is also installed, it may upgrade the driver again.
        </div>
      )}

      {!isInstalling &&
        installOutput.length === 0 &&
        !canProceed &&
        !needsRepair &&
        supportedVersion && (
        <div className="border border-border bg-card p-4 space-y-3">
          <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            What will happen:
          </div>
          <ul className="font-mono text-xs text-text-secondary space-y-1 list-disc list-inside">
            <li>Download VirtualHIDDevice v{supportedVersion} from pqrs.org</li>
            <li>Verify the package signature</li>
            <li>Install and activate the system extension</li>
          </ul>
        </div>
      )}

      {canProceed && (
        <div className="bg-status-success/10 border border-status-success/30 p-3 font-mono text-xs text-status-success">
          Virtual keyboard driver is installed. Click Next to continue.
        </div>
      )}
    </div>
  );
}

function ApproveStepContent({
  driverActivated,
  driverPendingApproval,
}: {
  driverActivated: boolean | null;
  driverPendingApproval: boolean | null;
}) {
  if (driverActivated) {
    return (
      <div className="bg-status-success/10 border border-status-success/30 p-3 font-mono text-xs text-status-success">
        System extension approved. Click Next to continue.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-mono text-xs">
        <span
          className={cn(
            "size-2 rounded-full",
            driverPendingApproval
              ? "bg-amber-500 animate-pulse"
              : "bg-muted-foreground"
          )}
        />
        <span className="text-text-secondary">
          {driverPendingApproval
            ? "Waiting for your approval"
            : "Not yet activated"}
        </span>
      </div>

      <ol className="font-mono text-xs text-text-secondary list-decimal list-inside space-y-2">
        <li>
          Click <strong className="text-foreground">"Open System Settings"</strong> below
        </li>
        <li>
          Click <strong className="text-foreground">"Driver Extensions"</strong>
        </li>
        <li>
          Toggle <strong className="text-foreground">Karabiner DriverKit VirtualHIDDevice</strong> to ON
        </li>
      </ol>
    </div>
  );
}

function PermissionStepContent() {
  return (
    <div className="space-y-4">
      <ol className="font-mono text-xs text-text-secondary list-decimal list-inside space-y-2">
        <li>
          Click <strong className="text-foreground">"Open System Settings"</strong> below — Finder will also reveal the kanata binary
        </li>
        <li>
          Drag the <strong className="text-foreground">kanata binary</strong> from Finder into the Input Monitoring list
        </li>
        <li>
          Make sure the toggle is <strong className="text-foreground">ON</strong>
        </li>
      </ol>

      <img
        src="input_monitoring_screenshot.png"
        alt="Drag the kanata binary from Finder into the Input Monitoring settings"
        className="rounded-md border border-border"
      />
    </div>
  );
}

function InstallStepFooter({
  isInstalling,
  installFailed,
  canProceed,
  needsRepair,
  onInstall,
  onCancel,
  onNext,
}: {
  isInstalling: boolean;
  installFailed: boolean;
  canProceed: boolean;
  needsRepair: boolean;
  onInstall: () => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  if (isInstalling) {
    return (
      <Button
        variant="outline"
        onClick={onCancel}
        className="font-mono text-xs rounded-none border-border hover:bg-secondary"
      >
        CANCEL
      </Button>
    );
  }

  if (canProceed) {
    return (
      <Button
        onClick={onNext}
        className={cn(
          "font-mono text-xs rounded-none min-w-32 tracking-wide",
          "bg-foreground text-background hover:bg-foreground/90"
        )}
      >
        NEXT &gt;
      </Button>
    );
  }

  return (
    <>
      {installFailed && (
        <Button
          variant="outline"
          onClick={onInstall}
          className="font-mono text-xs rounded-none border-border hover:bg-secondary"
        >
          RETRY
        </Button>
      )}
      {!installFailed && (
        <Button
          onClick={onInstall}
          disabled={isInstalling}
          className={cn(
            "font-mono text-xs rounded-none min-w-40 tracking-wide",
            "bg-foreground text-background hover:bg-foreground/90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {needsRepair ? "REPAIR DRIVER" : "INSTALL DRIVER"}
        </Button>
      )}
    </>
  );
}

function ApproveStepFooter({
  driverActivated,
  onOpenSettings,
  onRetryActivation,
  onNext,
}: {
  driverActivated: boolean | null;
  onOpenSettings: () => void;
  onRetryActivation: () => void;
  onNext: () => void;
}) {
  if (driverActivated) {
    return (
      <Button
        onClick={onNext}
        className={cn(
          "font-mono text-xs rounded-none min-w-32 tracking-wide",
          "bg-foreground text-background hover:bg-foreground/90"
        )}
      >
        NEXT &gt;
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={onRetryActivation}
        className="font-mono text-xs rounded-none border-border hover:bg-secondary"
      >
        RETRY ACTIVATION
      </Button>
      <Button
        onClick={onOpenSettings}
        className={cn(
          "font-mono text-xs rounded-none min-w-48 tracking-wide",
          "bg-foreground text-background hover:bg-foreground/90"
        )}
      >
        OPEN SYSTEM SETTINGS
      </Button>
    </>
  );
}
