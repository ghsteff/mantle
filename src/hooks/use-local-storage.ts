import { useEffect, useState } from "react";

interface UseLocalStorageOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
}

const defaultSerialize = (value: unknown) => JSON.stringify(value);
const defaultDeserialize = <T,>(raw: string) => JSON.parse(raw) as T;

export function useLocalStorage<T>(
  key: string | undefined,
  defaultValue: T,
  options: UseLocalStorageOptions<T> = {}
) {
  const serialize = options.serialize ?? defaultSerialize;
  const deserialize = options.deserialize ?? defaultDeserialize;

  const [value, setValue] = useState<T>(() => {
    if (!key || typeof window === "undefined") {
      return defaultValue;
    }

    try {
      const stored = localStorage.getItem(key);
      if (stored === null) {
        return defaultValue;
      }
      return deserialize(stored);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (!key || typeof window === "undefined") return;
    try {
      localStorage.setItem(key, serialize(value));
    } catch {
      // Ignore localStorage errors
    }
  }, [key, serialize, value]);

  return [value, setValue] as const;
}
