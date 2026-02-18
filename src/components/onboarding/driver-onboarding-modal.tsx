import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";
import { Dialog, DialogContent } from "../ui/dialog";
import { cn } from "../../lib/utils";
import { useKarabinerActions, useKarabinerState } from "../../contexts";

type OnboardingStep = "install" | "approve" | "permission";

interface DriverOnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onOpenInputMonitoringSettings: () => void;
}

const STEP_LABELS: Record<OnboardingStep, { number: string; title: string; description: string }> = {
  install: {
    number: "01",
    title: "INSTALL VIRTUAL KEYBOARD DRIVER",
    description: "Mantle needs a virtual keyboard driver to intercept and remap your keys.",
  },
  approve: {
    number: "02",
    title: "APPROVE SYSTEM EXTENSION",
    description: "macOS requires you to approve the virtual keyboard driver before it can run. This is a one-time step.",
  },
  permission: {
    number: "03",
    title: "GRANT INPUT MONITORING",
    description: "Grant Kanata permission to monitor keyboard input so remappings can take effect.",
  },
};

const APPROVAL_POLL_INTERVAL_MS = 3000;

export function DriverOnboardingModal({
  open,
  onComplete,
  onOpenInputMonitoringSettings,
}: DriverOnboardingModalProps) {
  const {
    driverInstalled,
    driverActivated,
    driverPendingApproval,
    homebrewInstalled,
    installStatus,
    installOutput,
    installError,
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

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [installOutput]);

  // Determine the correct starting step based on current state
  useEffect(() => {
    if (open) {
      checkStatus();
    }
  }, [open, checkStatus]);

  // Route to the correct step whenever state changes
  useEffect(() => {
    if (!open) return;

    if (driverInstalled && driverActivated) {
      setStep("permission");
    } else if (driverInstalled && !driverActivated) {
      setStep("approve");
    } else {
      setStep("install");
    }
  }, [open, driverInstalled, driverActivated]);

  // After install succeeds, re-check to pick up the new state
  useEffect(() => {
    if (installStatus === "success") {
      checkStatus();
    }
  }, [installStatus, checkStatus]);

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
    if (step === "approve" && driverActivated) {
      setStep("permission");
    }
  }, [step, driverActivated]);

  const isInstalling = installStatus === "installing";
  const installFailed = installStatus === "error";
  const installSucceeded = installStatus === "success";

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
    setTimeout(() => checkStatus(), 2000);
  };

  const handleNext = () => {
    if (step === "install" && driverInstalled) {
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

  const currentStep = STEP_LABELS[step];

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-background border-border rounded-none shadow-none flex flex-col overflow-hidden"
        showCloseButton={false}
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
                homebrewInstalled={homebrewInstalled}
                driverInstalled={driverInstalled}
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
                  installSucceeded={installSucceeded}
                  driverInstalled={driverInstalled}
                  homebrewInstalled={homebrewInstalled}
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
                    onClick={handleOpenSettings}
                    className="font-mono text-xs rounded-none border-border hover:bg-secondary"
                  >
                    OPEN SYSTEM SETTINGS
                  </Button>
                  <Button
                    onClick={handleDone}
                    className={cn(
                      "font-mono text-xs rounded-none min-w-32 tracking-wide",
                      "bg-foreground text-background hover:bg-foreground/90"
                    )}
                  >
                    DONE
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
  homebrewInstalled,
  driverInstalled,
  isInstalling,
  installFailed,
  installSucceeded,
  installOutput,
  installError,
  terminalRef,
}: {
  homebrewInstalled: boolean | null;
  driverInstalled: boolean | null;
  isInstalling: boolean;
  installFailed: boolean;
  installSucceeded: boolean;
  installOutput: string[];
  installError: string | null;
  terminalRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              homebrewInstalled ? "bg-status-success" : "bg-muted-foreground"
            )}
          />
          <span className="text-text-secondary">
            Homebrew: {homebrewInstalled ? "Installed" : homebrewInstalled === null ? "Checking..." : "Not installed"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              driverInstalled ? "bg-status-success" : "bg-muted-foreground"
            )}
          />
          <span className="text-text-secondary">
            Virtual Keyboard Driver: {driverInstalled ? "Installed" : driverInstalled === null ? "Checking..." : "Not installed"}
          </span>
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

      {!isInstalling && installOutput.length === 0 && !installSucceeded && !driverInstalled && (
        <div className="border border-border bg-card p-4 space-y-3">
          <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            What will happen:
          </div>
          <ul className="font-mono text-xs text-text-secondary space-y-1 list-disc list-inside">
            <li>Download the virtual keyboard driver package</li>
            <li>Extract and install only the driver component</li>
            <li>Activate the system extension</li>
          </ul>
        </div>
      )}

      {(installSucceeded || driverInstalled) && (
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
  installSucceeded,
  driverInstalled,
  homebrewInstalled,
  onInstall,
  onCancel,
  onNext,
}: {
  isInstalling: boolean;
  installFailed: boolean;
  installSucceeded: boolean;
  driverInstalled: boolean | null;
  homebrewInstalled: boolean | null;
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

  if (installSucceeded || driverInstalled) {
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
          {homebrewInstalled === false
            ? "INSTALL HOMEBREW & DRIVER"
            : "INSTALL DRIVER"}
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
