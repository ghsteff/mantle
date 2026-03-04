import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { KeyboardConfig, ExportResult, ImportResult } from "../types";
import { useConfigActionsInternal, useConfigState } from "./config-context";
import { useUIActions, useUIState } from "./ui-context";
import { toErrorMessage, assertContext } from "../lib/errors";
import { getProfileNameError } from "../lib/profile-name";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createProfileInRuntime,
  deleteProfileInRuntime,
  getActiveProfileFromRuntime,
  listProfilesFromRuntime,
  renameProfileInRuntime,
  switchProfileInRuntime,
} from "../platform/profiles-runtime";
import { exportKbdFromRuntime, importKbdFromRuntime } from "../platform/kbd-runtime";

interface ProfileContextValue {
  createProfile: (name: string, config: KeyboardConfig) => Promise<boolean>;
  switchProfile: (name: string) => Promise<boolean>;
  deleteProfile: (name: string) => Promise<boolean>;
  renameProfile: (oldName: string, newName: string) => Promise<boolean>;
  refreshProfiles: () => Promise<void>;
  exportKbd: () => Promise<ExportResult>;
  importKbd: () => Promise<ImportResult>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

type DiscardChangesDialogState = { kind: "closed" } | { kind: "open" };

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isDirty, activeProfile } = useConfigState();
  const {
    setConfig,
    setActiveProfile,
    setProfiles,
    setIsDirty,
    setError,
    loadConfig,
  } = useConfigActionsInternal();

  const { activeLayer } = useUIState();
  const { setActiveLayer, setSelectedKey } = useUIActions();
  const hasInitialized = useRef(false);
  const discardChangesResolverRef = useRef<((confirmed: boolean) => void) | null>(
    null
  );
  const [discardChangesDialog, setDiscardChangesDialog] =
    useState<DiscardChangesDialogState>({ kind: "closed" });

  const resolveDiscardChangesDialog = (confirmed: boolean) => {
    discardChangesResolverRef.current?.(confirmed);
    discardChangesResolverRef.current = null;
    setDiscardChangesDialog({ kind: "closed" });
  };

  const confirmDiscardUnsavedChanges = useCallback(async () => {
    // Prevent re-entrancy; switching profiles while already confirming is a bug.
    if (discardChangesResolverRef.current) return false;

    setDiscardChangesDialog({ kind: "open" });
    return await new Promise<boolean>((resolve) => {
      discardChangesResolverRef.current = resolve;
    });
  }, []);

  // Load profiles list
  const refreshProfiles = useCallback(async () => {
    try {
      const [profilesList, active] = await Promise.all([
        listProfilesFromRuntime(),
        getActiveProfileFromRuntime(),
      ]);
      setProfiles(profilesList);
      setActiveProfile(active);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    }
  }, [setProfiles, setActiveProfile]);

  // Initialize on mount: refresh profiles, load config, set active layer
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      const [, loadedConfig] = await Promise.all([
        refreshProfiles(),
        loadConfig(),
      ]);
      if (loadedConfig) {
        // Set active layer to first layer if current isn't in the config
        const layerExists = loadedConfig.layers.find((l) => l.name === activeLayer);
        if (!layerExists) {
          setActiveLayer(loadedConfig.layers[0]?.name || "base");
        }
      }
    };
    initialize();
  }, [refreshProfiles, loadConfig, activeLayer, setActiveLayer]);

  useEffect(() => {
    return () => {
      // If we ever unmount with a pending confirmation, fail closed.
      discardChangesResolverRef.current?.(false);
      discardChangesResolverRef.current = null;
    };
  }, []);

  const createProfile = useCallback(async (name: string, profileConfig: KeyboardConfig): Promise<boolean> => {
    const nameError = getProfileNameError(name);
    if (nameError) {
      setError(nameError);
      return false;
    }
    try {
      const trimmedName = name.trim();
      const success = await createProfileInRuntime(trimmedName, profileConfig);
      if (success) {
        await refreshProfiles();
        // If this is the first profile or it became active, load it
        const newActive = await getActiveProfileFromRuntime();
        if (newActive === trimmedName) {
          setConfig(profileConfig);
          setActiveLayer(profileConfig.layers[0]?.name || "base");
        }
      }
      return success;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to create profile"));
      return false;
    }
  }, [refreshProfiles, setConfig, setActiveLayer, setError]);

  const switchProfile = useCallback(async (name: string): Promise<boolean> => {
    const nameError = getProfileNameError(name);
    if (nameError) {
      setError(nameError);
      return false;
    }
    // Don't switch if there are unsaved changes
    if (isDirty) {
      const confirmed = await confirmDiscardUnsavedChanges();
      if (!confirmed) return false;
    }

    try {
      const trimmedName = name.trim();
      const newConfig = await switchProfileInRuntime(trimmedName);
      if (newConfig) {
        setConfig(newConfig);
        setActiveProfile(trimmedName);
        setActiveLayer(newConfig.layers[0]?.name || "base");
        setIsDirty(false);
        setSelectedKey(null);
        setError(null);
        await refreshProfiles();
        return true;
      }
      return false;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to switch profile"));
      return false;
    }
  }, [confirmDiscardUnsavedChanges, isDirty, refreshProfiles, setConfig, setActiveProfile, setActiveLayer, setIsDirty, setSelectedKey, setError]);

  const deleteProfileAction = useCallback(async (name: string): Promise<boolean> => {
    const nameError = getProfileNameError(name);
    if (nameError) {
      setError(nameError);
      return false;
    }
    try {
      const trimmedName = name.trim();
      const success = await deleteProfileInRuntime(trimmedName);
      if (success) {
        await refreshProfiles();
        // If we deleted the active profile, reload config
        if (trimmedName === activeProfile) {
          await loadConfig();
        }
      }
      return success;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to delete profile"));
      return false;
    }
  }, [activeProfile, loadConfig, refreshProfiles, setError]);

  const renameProfileAction = useCallback(async (oldName: string, newName: string): Promise<boolean> => {
    const oldNameError = getProfileNameError(oldName);
    if (oldNameError) {
      setError(oldNameError);
      return false;
    }
    const newNameError = getProfileNameError(newName);
    if (newNameError) {
      setError(newNameError);
      return false;
    }
    try {
      const success = await renameProfileInRuntime(oldName.trim(), newName.trim());
      if (success) {
        await refreshProfiles();
      }
      return success;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to rename profile"));
      return false;
    }
  }, [refreshProfiles, setError]);

  const exportKbd = useCallback(async (): Promise<ExportResult> => {
    try {
      return await exportKbdFromRuntime();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to export",
      };
    }
  }, []);

  const importKbd = useCallback(async (): Promise<ImportResult> => {
    try {
      return await importKbdFromRuntime();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to import",
      };
    }
  }, []);

  const value = useMemo<ProfileContextValue>(() => ({
    createProfile,
    switchProfile,
    deleteProfile: deleteProfileAction,
    renameProfile: renameProfileAction,
    refreshProfiles,
    exportKbd,
    importKbd,
  }), [
    createProfile,
    switchProfile,
    deleteProfileAction,
    renameProfileAction,
    refreshProfiles,
    exportKbd,
    importKbd,
  ]);

  return (
    <ProfileContext.Provider value={value}>
      {children}

      <AlertDialog
        open={discardChangesDialog.kind === "open"}
        onOpenChange={(open) => {
          if (!open) resolveDiscardChangesDialog(false);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Switching profiles will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolveDiscardChangesDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => resolveDiscardChangesDialog(true)}
            >
              Discard and switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  assertContext(context, "useProfile", "ProfileProvider");
  return context;
}
