import { useState } from "react";
import { useProfile } from "../../contexts";
import { Button } from "../ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { DownloadIcon, UploadIcon } from "lucide-react";

/**
 * Keyboard config type for import.
 */
interface KeyboardConfig {
  sourceKeys: string[];
  layers: { name: string; keys: Record<string, string> }[];
  aliases?: Record<string, string>;
}

/**
 * Icon buttons for importing/exporting .kbd files.
 */
export function ImportExportButton() {
  const { exportKbd, importKbd, createProfile, switchProfile } = useProfile();

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importedConfig, setImportedConfig] = useState<KeyboardConfig | null>(
    null
  );
  const [suggestedImportName, setSuggestedImportName] = useState("");

  const handleExport = async () => {
    const result = await exportKbd();
    if (
      !result.success &&
      result.error &&
      result.error !== "Export cancelled"
    ) {
      alert(`Export failed: ${result.error}`);
    }
  };

  const handleImport = async () => {
    const result = await importKbd();
    if (result.success && result.config) {
      setImportedConfig(result.config);
      setSuggestedImportName(result.suggestedName || "imported");
      setImportDialogOpen(true);
    } else if (result.error && result.error !== "Import cancelled") {
      alert(`Import failed: ${result.error}`);
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

  return (
    <>
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={handleImport}
            >
              <UploadIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import .kbd File</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={handleExport}
            >
              <DownloadIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export .kbd File</TooltipContent>
        </Tooltip>
      </div>

      {/* Import Profile Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import .kbd File</DialogTitle>
            <DialogDescription>
              Enter a name for the imported profile. The configuration has{" "}
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
              variant="outline"
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
}
