import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface ExclusiveAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shown when Kanata cannot grab the keyboard because another remapper already owns it.
 */
export function ExclusiveAccessModal({
  open,
  onOpenChange,
}: ExclusiveAccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Another Keyboard Remapper Is Active</DialogTitle>
          <DialogDescription>
            Mantle started Kanata, but another app already has exclusive access to
            your keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ol className="text-sm text-text-secondary list-decimal list-inside space-y-2">
            <li>Quit Karabiner-Elements (or any other remapper)</li>
            <li>Make sure no remapper background process is still running</li>
            <li>Return to Mantle and click Start again</li>
          </ol>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got It</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
