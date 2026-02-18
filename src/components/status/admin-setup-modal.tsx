import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface AdminSetupModalProps {
  open: boolean;
  cancelled: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}

export function AdminSetupModal({
  open,
  cancelled,
  onOpenChange,
  onRetry,
}: AdminSetupModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Administrator Access Required</DialogTitle>
          <DialogDescription>
            Mantle needs one-time administrator approval to manage the Kanata
            LaunchDaemon without asking for your password every start/stop.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-text-secondary">
            {cancelled
              ? "The macOS admin prompt was cancelled, so setup did not complete."
              : "macOS will show a system password prompt while this setup runs."}
          </p>
          <ol className="text-sm text-text-secondary list-decimal list-inside space-y-2">
            <li>Click Retry to start setup again</li>
            <li>Approve the macOS password prompt once</li>
            <li>After setup succeeds, start/stop should be passwordless</li>
          </ol>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Later
          </Button>
          <Button
            onClick={() => {
              onRetry();
              onOpenChange(false);
            }}
          >
            Retry Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
