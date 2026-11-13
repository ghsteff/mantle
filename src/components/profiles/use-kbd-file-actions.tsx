import { useState } from "react";
import { useConfigState, useProfile, useToast } from "../../contexts";
import { findProfileNameConflict, getProfileNameError } from "@/lib/profile-name";
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
  const { profiles } = useConfigState();
  const { showToast } = useToast();

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

  const startExport = async (profileName: string) => {
    const result = await exportKbd(profileName);
    if (result.success) {
      showToast({
        tone: "success",
        title: `Exported “${profileName}”`,
        description: result.path,
      });
    } else if (result.error && result.error !== "Export cancelled") {
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

  const importNameConflict = findProfileNameConflict(
    suggestedImportName,
    profiles.map((profile) => profile.name)
  );
  const importNameError = suggestedImportName.trim()
    ? (getProfileNameError(suggestedImportName) ??
      (importNameConflict ? `A profile named “${importNameConflict}” already exists.` : null))
    : null;
  const canImport = Boolean(suggestedImportName.trim()) && !importNameError;

  const handleImportConfirm = async () => {
    if (!importedConfig || !canImport) return;
    const name = suggestedImportName.trim();
    const created = await createProfile(name, importedConfig);
    if (!created) return;
    const switched = await switchProfile(name);
    if (switched) {
      showToast({ tone: "success", title: `Imported “${name}”` });
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
            <DialogTitle>Import as a new profile</DialogTitle>
            <DialogDescription>
              Found {importedConfig?.layers.length || 0}{" "}
              {importedConfig?.layers.length === 1 ? "layer" : "layers"} covering{" "}
              {importedConfig?.sourceKeys.length || 0} keys. Choose a name for
              the new profile.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={suggestedImportName}
            onChange={(e) => setSuggestedImportName(e.target.value)}
            placeholder="Profile name"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleImportConfirm();
            }}
            aria-invalid={Boolean(importNameError)}
            autoFocus
          />
          {importNameError && (
            <p className="text-xs text-status-error">{importNameError}</p>
          )}
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
              onClick={() => void handleImportConfirm()}
              disabled={!canImport}
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
