import { useState } from "react";
import { useProfile } from "../../contexts";
import { Button } from "../ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";

interface KeyboardConfig {
  sourceKeys: string[];
  layers: { name: string; keys: Record<string, string> }[];
  aliases?: Record<string, string>;
}

type ErrorDialogState =
  | { kind: "closed" }
  | { kind: "open"; title: string; description: string };

export function useKbdFileActions() {
  const { exportKbd, importKbd, createProfile, switchProfile } = useProfile();

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importedConfig, setImportedConfig] = useState<KeyboardConfig | null>(
    null
  );
  const [suggestedImportName, setSuggestedImportName] = useState("");
  const [errorDialog, setErrorDialog] = useState<ErrorDialogState>({
    kind: "closed",
  });

  const openErrorDialog = (title: string, description: string) => {
    setErrorDialog({ kind: "open", title, description });
  };

  const closeErrorDialog = () => {
    setErrorDialog({ kind: "closed" });
  };

  const startExport = async () => {
    const result = await exportKbd();
    if (
      !result.success &&
      result.error &&
      result.error !== "Export cancelled"
    ) {
      openErrorDialog("Export failed", result.error);
    }
  };

  const startImport = async () => {
    const result = await importKbd();
    if (result.success && result.config) {
      setImportedConfig(result.config);
      setSuggestedImportName(result.suggestedName || "imported");
      setImportDialogOpen(true);
    } else if (result.error && result.error !== "Import cancelled") {
      openErrorDialog("Import failed", result.error);
    }
  };

  const handleImportConfirm = async () => {
    if (importedConfig && suggestedImportName.trim()) {
      const success = await createProfile(
        suggestedImportName.trim(),
        importedConfig
      );
      if (success) {
        await switchProfile(suggestedImportName.trim());
      }
    }
    setImportDialogOpen(false);
    setImportedConfig(null);
    setSuggestedImportName("");
  };

  const dialogs = (
    <>
      <AlertDialog
        open={errorDialog.kind === "open"}
        onOpenChange={(open) => {
          if (!open) closeErrorDialog();
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {errorDialog.kind === "open" ? errorDialog.title : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.kind === "open" ? errorDialog.description : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={closeErrorDialog}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Configuration</DialogTitle>
            <DialogDescription>
              Name this profile. The imported config has{" "}
              {importedConfig?.layers.length || 0} layer(s) and{" "}
              {importedConfig?.sourceKeys.length || 0} keys.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={suggestedImportName}
            onChange={(e) => setSuggestedImportName(e.target.value)}
            placeholder="Profile name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleImportConfirm();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setImportDialogOpen(false);
                setImportedConfig(null);
                setSuggestedImportName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={!suggestedImportName.trim()}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return { startImport, startExport, dialogs };
}
