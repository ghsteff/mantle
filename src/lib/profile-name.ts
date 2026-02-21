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

