const MAX_PROFILE_NAME_LENGTH = 64;

export function getProfileNameError(rawName: string) {
  const name = rawName.trim();
  if (!name) {
    return "Profile name is required.";
  }
  if (name.length > MAX_PROFILE_NAME_LENGTH) {
    return `Profile name must be ${MAX_PROFILE_NAME_LENGTH} characters or fewer.`;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    return "Use only letters, numbers, '-' and '_' (no spaces).";
  }
  return null;
}


// Profile names become file names, and the default macOS file system is case-insensitive.
export function findProfileNameConflict(rawName: string, existingNames: string[]) {
  const name = rawName.trim().toLowerCase();
  return existingNames.find((existing) => existing.toLowerCase() === name) ?? null;
}

const COPY_SUFFIX = /-copy(-\d+)?$/;

/**
 * Suggests "<source>-copy", then "<source>-copy-2", "-copy-3"… so that
 * duplicating "colemak-copy" yields "colemak-copy-2", not "colemak-copy-copy".
 * `suffixStart` is where the "copy…" part begins, so the dialog can select it.
 */
export function suggestDuplicateProfileName(sourceName: string, existingNames: string[]) {
  const stem = sourceName.replace(COPY_SUFFIX, "");
  for (let attempt = 1; ; attempt++) {
    const suffix = attempt === 1 ? "copy" : `copy-${attempt}`;
    const base = stem.slice(0, MAX_PROFILE_NAME_LENGTH - suffix.length - 1);
    const name = `${base}-${suffix}`;
    if (!findProfileNameConflict(name, existingNames)) {
      return { name, suffixStart: base.length + 1 };
    }
  }
}
