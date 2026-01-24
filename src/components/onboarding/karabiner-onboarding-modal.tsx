import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";
import { Dialog, DialogContent } from "../ui/dialog";
import { cn } from "../../lib/utils";
import { useKarabiner } from "../../contexts/karabiner-context";

type OnboardingStep = "install" | "permission";

interface KarabinerOnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onOpenInputMonitoringSettings: () => void;
}

/**
 * Multi-step onboarding wizard for Karabiner driver installation.
 * Step 1: Install Karabiner via Homebrew
 * Step 2: Set up Input Monitoring permission
 */
export function KarabinerOnboardingModal({
  open,
  onComplete,
  onOpenInputMonitoringSettings,
}: KarabinerOnboardingModalProps) {
  const {
    driverInstalled,
    homebrewInstalled,
    installStatus,
    installOutput,
    installError,
    startInstall,
    cancelInstall,
    checkStatus,
  } = useKarabiner();

  const [step, setStep] = useState<OnboardingStep>("install");
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal output
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [installOutput]);

  // If driver becomes installed, advance to permission step
  useEffect(() => {
    if (driverInstalled && step === "install") {
      setStep("permission");
    }
  }, [driverInstalled, step]);

  // Re-check driver status after install success
  useEffect(() => {
    if (installStatus === "success") {
      checkStatus();
    }
  }, [installStatus, checkStatus]);

  const handleInstall = () => {
    startInstall();
  };

  const handleCancel = () => {
    cancelInstall();
  };

  const handleOpenSettings = () => {
    onOpenInputMonitoringSettings();
  };

  const handleDone = () => {
    onComplete();
  };

  const isInstalling = installStatus === "installing";
  const installFailed = installStatus === "error";

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-bg-primary border-border rounded-none shadow-none flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-bg-secondary select-none">
          <div className="flex items-center gap-4">
            <div className="size-3 bg-accent" />
            <h1 className="font-mono text-sm font-bold tracking-wider uppercase text-text-primary">
              System Setup
            </h1>
          </div>
          <div className="font-mono text-xs text-text-muted">
            Step {step === "install" ? "01" : "02"} / 02
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-6 border-b border-border bg-bg-primary">
            <h2 className="font-mono text-lg font-bold text-text-primary mb-2">
              {step === "install"
                ? "KARABINER DRIVER REQUIRED"
                : "INPUT MONITORING PERMISSION"}
            </h2>
            <p className="font-mono text-xs text-text-muted max-w-xl">
              {step === "install"
                ? "Mantle requires the Karabiner virtual keyboard driver to intercept and remap your keys. This driver is installed via Homebrew."
                : "Mantle needs Input Monitoring permission to intercept your keyboard input."}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto bg-bg-tertiary p-6">
            {step === "install" ? (
              <div className="space-y-4">
                {/* Status info */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        homebrewInstalled
                          ? "bg-status-success"
                          : "bg-text-muted"
                      )}
                    />
                    <span className="text-text-secondary">
                      Homebrew:{" "}
                      {homebrewInstalled ? "Installed" : "Not installed"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        driverInstalled ? "bg-status-success" : "bg-text-muted"
                      )}
                    />
                    <span className="text-text-secondary">
                      Karabiner Driver:{" "}
                      {driverInstalled ? "Installed" : "Not installed"}
                    </span>
                  </div>
                </div>

                {/* Terminal output */}
                {(isInstalling || installOutput.length > 0) && (
                  <div
                    ref={terminalRef}
                    className="bg-bg-primary border border-border p-3 font-mono text-xs h-64 overflow-y-auto"
                  >
                    {installOutput.map((line, i) => (
                      <div key={i} className="text-text-secondary whitespace-pre-wrap">
                        {line}
                      </div>
                    ))}
                    {isInstalling && (
                      <div className="text-accent animate-pulse">_</div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {installFailed && installError && (
                  <div className="bg-status-error/10 border border-status-error/30 p-3 font-mono text-xs text-status-error">
                    {installError}
                  </div>
                )}

                {/* Info about what will happen */}
                {!isInstalling && installOutput.length === 0 && (
                  <div className="border border-border bg-bg-secondary p-4 space-y-3">
                    <div className="font-mono text-xs text-text-muted uppercase tracking-wider">
                      Installation will:
                    </div>
                    <ul className="font-mono text-xs text-text-secondary space-y-1 list-disc list-inside">
                      {!homebrewInstalled && (
                        <li>Install Homebrew package manager</li>
                      )}
                      <li>Install Karabiner-Elements via Homebrew</li>
                      <li>Enable the virtual keyboard driver</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <ol className="text-sm text-text-secondary list-decimal list-inside space-y-2 font-mono">
                  <li>
                    Click the button below to open System Settings and reveal
                    the kanata binary in Finder
                  </li>
                  <li>
                    Drag the kanata binary from Finder into the Input Monitoring
                    list
                  </li>
                  <li>
                    Make sure the <strong>toggle is turned ON</strong> for the
                    entry
                  </li>
                </ol>

                <img
                  src="input_monitoring_screenshot.png"
                  alt="Drag the kanata binary from Finder into the Input Monitoring settings"
                  className="rounded-md border border-border"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-bg-secondary flex items-center justify-between">
            <div className="font-mono text-xs text-text-muted">
              {step === "install" && isInstalling && "Installing..."}
              {step === "install" && installFailed && "Installation failed"}
            </div>
            <div className="flex items-center gap-3">
              {step === "install" ? (
                <>
                  {isInstalling ? (
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="font-mono text-xs rounded-none border-border hover:bg-bg-tertiary"
                    >
                      CANCEL
                    </Button>
                  ) : (
                    <>
                      {installFailed && (
                        <Button
                          variant="outline"
                          onClick={handleInstall}
                          className="font-mono text-xs rounded-none border-border hover:bg-bg-tertiary"
                        >
                          RETRY
                        </Button>
                      )}
                      <Button
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className={cn(
                          "font-mono text-xs rounded-none min-w-40 tracking-wide",
                          "bg-text-primary text-bg-primary hover:bg-text-primary/90",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {homebrewInstalled
                          ? "INSTALL KARABINER"
                          : "INSTALL HOMEBREW & KARABINER"}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleOpenSettings}
                    className="font-mono text-xs rounded-none border-border hover:bg-bg-tertiary"
                  >
                    OPEN SYSTEM SETTINGS
                  </Button>
                  <Button
                    onClick={handleDone}
                    className={cn(
                      "font-mono text-xs rounded-none min-w-32 tracking-wide",
                      "bg-text-primary text-bg-primary hover:bg-text-primary/90"
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
