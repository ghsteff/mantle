import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";
import { Dialog, DialogContent } from "../ui/dialog";
import { cn } from "../../lib/utils";
import { useKarabiner } from "../../contexts/karabiner-context";

type OnboardingStep = "install" | "activate" | "permission";

interface KarabinerOnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onOpenInputMonitoringSettings: () => void;
}

/**
 * Multi-step onboarding wizard for Karabiner driver setup.
 * Step 1: Ensure Karabiner-Elements app is installed
 * Step 2: Complete Karabiner setup and activate driver
 * Step 3: Grant Kanata input monitoring permissions
 */
export function KarabinerOnboardingModal({
  open,
  onComplete,
  onOpenInputMonitoringSettings,
}: KarabinerOnboardingModalProps) {
  const {
    driverInstalled,
    appInstalled,
    homebrewInstalled,
    installStatus,
    installOutput,
    installError,
    startInstall,
    cancelInstall,
    checkStatus,
    launchApp,
  } = useKarabiner();

  const [step, setStep] = useState<OnboardingStep>("install");
  const [step2Verified, setStep2Verified] = useState(false);
  const [isCheckingStep2, setIsCheckingStep2] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal output
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [installOutput]);

  // Reset to step 1 and check status when modal opens
  useEffect(() => {
    if (open) {
      setStep("install");
      setStep2Verified(false);
      setIsCheckingStep2(false);
      // Check current status to show accurate info
      checkStatus();
    }
  }, [open, checkStatus]);

  // After successful install, re-check status
  useEffect(() => {
    if (installStatus === "success") {
      // Re-check status after a brief delay to ensure files are in place
      setTimeout(() => {
        checkStatus();
      }, 500);
    }
  }, [installStatus, checkStatus]);

  // After app is confirmed installed, auto-launch Karabiner
  useEffect(() => {
    if (installStatus === "success" && appInstalled) {
      // Automatically launch Karabiner-Elements so user can complete setup
      launchApp();
    }
  }, [installStatus, appInstalled, launchApp]);

  // Update step 2 verification when status changes
  useEffect(() => {
    if (isCheckingStep2 && driverInstalled) {
      setStep2Verified(true);
      setIsCheckingStep2(false);
    }
  }, [isCheckingStep2, driverInstalled]);

  const handleInstall = () => {
    startInstall();
  };

  const handleCancel = () => {
    cancelInstall();
  };

  const handleCheckStep2 = async () => {
    setIsCheckingStep2(true);
    await checkStatus();
  };

  const handleNext = () => {
    if (step === "install" && appInstalled) {
      setStep("activate");
    } else if (step === "activate" && step2Verified) {
      setStep("permission");
    }
  };

  const isInstalling = installStatus === "installing";
  const installFailed = installStatus === "error";
  const installSucceeded = installStatus === "success";
  const installCompleted = installSucceeded && appInstalled;

  const handleOpenKarabinerApp = async () => {
    await launchApp();
  };

  const handleOpenSettings = () => {
    onOpenInputMonitoringSettings();
  };

  const handleDone = () => {
    onComplete();
  };

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
            Step {step === "install" ? "01" : step === "activate" ? "02" : "03"} / 03
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-6 border-b border-border bg-bg-primary">
            <h2 className="font-mono text-lg font-bold text-text-primary mb-2">
              {step === "install"
                ? "INSTALL KARABINER-ELEMENTS"
                : step === "activate"
                ? "ACTIVATE KARABINER DRIVER"
                : "KANATA INPUT MONITORING"}
            </h2>
            <p className="font-mono text-xs text-text-muted max-w-xl">
              {step === "install"
                ? "Mantle requires the Karabiner virtual keyboard driver to intercept and remap your keys. This driver is installed via Homebrew."
                : step === "activate"
                ? "Open Karabiner-Elements and complete its setup to activate the virtual keyboard driver."
                : "Grant Kanata permission to monitor keyboard input."}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto bg-bg-tertiary p-6">
            {step === "install" ? (
              <div className="space-y-4">
                {/* Status */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        homebrewInstalled ? "bg-status-success" : "bg-text-muted"
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
                        appInstalled ? "bg-status-success" : "bg-text-muted"
                      )}
                    />
                    <span className="text-text-secondary">
                      Karabiner-Elements:{" "}
                      {appInstalled ? "Installed" : "Not installed"}
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
                {!isInstalling && installOutput.length === 0 && !installSucceeded && (
                  <div className="border border-border bg-bg-secondary p-4 space-y-3">
                    <div className="font-mono text-xs text-text-muted uppercase tracking-wider">
                      What will happen:
                    </div>
                    <ul className="font-mono text-xs text-text-secondary space-y-1 list-disc list-inside">
                      {!homebrewInstalled && (
                        <li>Install Homebrew package manager</li>
                      )}
                      <li>Download Karabiner-Elements installer</li>
                      <li>Automatically open the installer for you</li>
                      <li>You'll complete the installation with your admin password</li>
                    </ul>
                  </div>
                )}

                {/* Success message */}
                {installCompleted && (
                  <div className="bg-status-success/10 border border-status-success/30 p-3 font-mono text-xs text-status-success">
                    Installation complete! Karabiner-Elements has been launched. Complete its setup wizard, then click Next.
                  </div>
                )}

                {/* Installation succeeded but app not detected - PKG needs to be completed */}
                {installSucceeded && !appInstalled && (
                  <div className="bg-accent/10 border border-accent/30 p-4 space-y-2">
                    <div className="font-mono text-xs font-bold text-text-primary">
                      Complete PKG Installation
                    </div>
                    <div className="font-mono text-xs text-text-secondary">
                      <p>The Karabiner-Elements.pkg installer should have opened.</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2 mt-2">
                        <li>Complete the installation in the opened window</li>
                        <li>Click "Check Status" below once the installation finishes</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            ) : step === "activate" ? (
              <div className="space-y-4">
                {/* Driver status indicator */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        driverInstalled ? "bg-status-success" : "bg-text-muted"
                      )}
                    />
                    <span className="text-text-secondary">
                      Virtual Keyboard Driver:{" "}
                      {driverInstalled ? "Active" : "Not active"}
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="border border-border bg-bg-secondary p-4 space-y-3">
                  <div className="font-mono text-xs font-bold text-text-primary">
                    Complete Karabiner Setup
                  </div>
                  <div className="font-mono text-xs text-text-secondary space-y-2">
                    <p>
                      The virtual keyboard driver must be activated before Mantle can work.
                      This requires completing Karabiner's one-time setup.
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>If Karabiner-Elements didn't open automatically, click "Open Karabiner-Elements" below</li>
                      <li>Follow Karabiner's setup wizard</li>
                      <li>Grant all requested system permissions and approve the system extension</li>
                      <li>Click "Check Status" to verify the driver is active</li>
                    </ol>
                  </div>
                </div>

                {/* Success message */}
                {step2Verified && (
                  <div className="bg-status-success/10 border border-status-success/30 p-3 font-mono text-xs text-status-success">
                    Driver is active! Click Next to continue.
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
              {step === "install" && isInstalling && "Downloading..."}
              {step === "install" && installFailed && "Download failed"}
              {step === "install" && installSucceeded && !appInstalled && "Waiting for installation"}
              {step === "install" && installCompleted && "Installation complete"}
              {step === "activate" && (step2Verified ? "Driver is active" : "Waiting for driver activation")}
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
                  ) : installCompleted ? (
                    <Button
                      onClick={handleNext}
                      className={cn(
                        "font-mono text-xs rounded-none min-w-32 tracking-wide",
                        "bg-text-primary text-bg-primary hover:bg-text-primary/90"
                      )}
                    >
                      NEXT &gt;
                    </Button>
                  ) : installSucceeded && !appInstalled ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => checkStatus()}
                        className="font-mono text-xs rounded-none border-border hover:bg-bg-tertiary"
                      >
                        CHECK STATUS
                      </Button>
                      <Button
                        onClick={handleNext}
                        disabled={!appInstalled}
                        className={cn(
                          "font-mono text-xs rounded-none min-w-32 tracking-wide",
                          "bg-text-primary text-bg-primary hover:bg-text-primary/90",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        NEXT &gt;
                      </Button>
                    </>
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
                          ? "DOWNLOAD KARABINER"
                          : "INSTALL HOMEBREW & DOWNLOAD KARABINER"}
                      </Button>
                    </>
                  )}
                </>
              ) : step === "activate" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleOpenKarabinerApp}
                    className="font-mono text-xs rounded-none border-border hover:bg-bg-tertiary"
                  >
                    OPEN KARABINER-ELEMENTS
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCheckStep2}
                    className="font-mono text-xs rounded-none border-border hover:bg-bg-tertiary"
                  >
                    CHECK STATUS
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!step2Verified}
                    className={cn(
                      "font-mono text-xs rounded-none min-w-32 tracking-wide",
                      "bg-text-primary text-bg-primary hover:bg-text-primary/90",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    NEXT &gt;
                  </Button>
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
