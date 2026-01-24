import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface PermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
}

export function PermissionModal({
  open,
  onOpenChange,
  onOpenSettings,
}: PermissionModalProps) {
  const handleOpenSettings = () => {
    onOpenSettings();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Input Monitoring Permission Required</DialogTitle>
          <DialogDescription>
            Mantle needs Input Monitoring permission to intercept and remap your
            keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ol className="text-sm text-text-secondary list-decimal list-inside space-y-2">
            <li>Click the button below to open System Settings and reveal the kanata binary in Finder</li>
            <li>Drag the kanata binary from Finder into the Input Monitoring list</li>
            <li>Make sure the <strong>toggle is turned ON</strong> for the entry</li>
            <li>Click Start to try again</li>
          </ol>

          <img
            src="input_monitoring_screenshot.png"
            alt="Drag the kanata binary from Finder into the Input Monitoring settings"
            className="rounded-md border border-border"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleOpenSettings}>
            Open Input Monitoring Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
