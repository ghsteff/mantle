import { useState } from "react";
import type { Preset } from "../../presets";
import { PresetPicker } from "./preset-picker";
import { Button } from "../ui";
import { Input } from "../ui/input";
import { Dialog, DialogContent } from "../ui/dialog";
import { cn } from "../../lib/utils";

interface FirstRunWizardProps {
  open: boolean;
  onComplete: (profileName: string, preset: Preset) => void;
}

/**
 * First-run wizard shown when no profiles exist.
 * Technical, minimal design for initial setup.
 */
export function FirstRunWizard({ open, onComplete }: FirstRunWizardProps) {
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [profileName, setProfileName] = useState("default");
  const [step, setStep] = useState<"preset" | "name">("preset");

  const handleContinue = () => {
    if (selectedPreset) {
      setStep("name");
    }
  };

  const handleCreate = () => {
    if (selectedPreset && profileName.trim()) {
      onComplete(profileName.trim(), selectedPreset);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] p-0 gap-0 bg-background border-border rounded-none shadow-none flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-card select-none">
          <div className="flex items-center gap-4">
            <div className="size-3 bg-primary" />
            <h1 className="font-mono text-sm font-bold tracking-wider uppercase text-foreground">
              Mantle Setup
            </h1>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Step {step === "preset" ? "01" : "02"} / 02
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-6 border-b border-border bg-background">
            <h2 className="font-mono text-lg font-bold text-foreground mb-2">
              {step === "preset"
                ? "SELECT BASE CONFIGURATION"
                : "PROFILE CONFIGURATION"}
            </h2>
            <p className="font-mono text-xs text-muted-foreground max-w-xl">
              {step === "preset"
                ? "Choose a starting point for your keyboard layout. This defines the initial key mappings and layers."
                : "Assign a unique identifier to this configuration profile."}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto bg-secondary p-6">
            {step === "preset" ? (
              <PresetPicker
                selectedPresetId={selectedPreset?.metadata.id}
                onSelect={setSelectedPreset}
              />
            ) : (
              <div className="max-w-md space-y-8">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block">
                      Target Profile
                    </label>
                    <div className="border border-border bg-card p-3 font-mono text-sm text-text-secondary flex justify-between items-center">
                      <span>{selectedPreset?.metadata.name}</span>
                      <span className="text-xs border border-border px-1">
                        PRESET
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="profile-name"
                      className="font-mono text-xs text-muted-foreground uppercase tracking-wider block"
                    >
                      Profile ID
                    </label>
                    <Input
                      id="profile-name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="font-mono rounded-none border-border bg-background focus-visible:ring-0 focus-visible:border-primary h-10"
                      placeholder="default"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && profileName.trim()) {
                          handleCreate();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-3">
            {step === "name" && (
              <Button
                variant="outline"
                onClick={() => setStep("preset")}
                className="font-mono text-xs rounded-none border-border hover:bg-secondary"
              >
                BACK
              </Button>
            )}
            <Button
              onClick={step === "preset" ? handleContinue : handleCreate}
              disabled={
                step === "preset" ? !selectedPreset : !profileName.trim()
              }
              className={cn(
                "font-mono text-xs rounded-none min-w-32 tracking-wide",
                "bg-foreground text-background hover:bg-foreground/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {step === "preset" ? "NEXT >" : "INITIALIZE SYSTEM"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
