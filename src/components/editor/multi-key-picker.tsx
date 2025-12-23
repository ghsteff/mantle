import { useState, useEffect } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { ALL_KANATA_KEYS, KEY_CATEGORIES, findKeyOption } from "./kanata-keys";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface MultiKeyPickerProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Parse a multi expression back to key array
 */
function parseMultiKeys(value: string): string[] {
  if (!value) return [];

  const multiMatch = value.match(/\(multi\s+(.+)\)/);
  if (multiMatch) {
    return multiMatch[1].split(/\s+/).filter(Boolean);
  }

  // Single key
  if (value && !value.startsWith("(")) {
    return [value];
  }

  return [];
}

/**
 * Build a multi expression from keys array
 */
function buildMultiKeys(keys: string[]): string {
  if (keys.length === 0) return "";
  if (keys.length === 1) return keys[0];
  return `(multi ${keys.join(" ")})`;
}

/**
 * A picker for selecting multiple keys to combine.
 */
export function MultiKeyPicker({ value, onChange }: MultiKeyPickerProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Parse initial value
  useEffect(() => {
    setSelectedKeys(parseMultiKeys(value));
  }, [value]);

  const addKey = (key: string) => {
    if (!selectedKeys.includes(key)) {
      const newKeys = [...selectedKeys, key];
      setSelectedKeys(newKeys);
      onChange(buildMultiKeys(newKeys));
    }
    setSearch("");
  };

  const removeKey = (key: string) => {
    const newKeys = selectedKeys.filter((k) => k !== key);
    setSelectedKeys(newKeys);
    onChange(buildMultiKeys(newKeys));
  };

  const availableKeys = ALL_KANATA_KEYS.filter(
    (k) => !selectedKeys.includes(k.value)
  );

  return (
    <div className="space-y-2">
      {/* Combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="text-text-muted">
              {selectedKeys.length === 0 ? "Add keys..." : "+ Add another key"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command
            filter={(value, search) => {
              const option = findKeyOption(value);
              if (!option) return 0;

              const searchLower = search.toLowerCase();
              const valueLower = option.value.toLowerCase();
              const labelLower = option.label.toLowerCase();

              if (valueLower === searchLower) return 1;
              if (
                valueLower.startsWith(searchLower) ||
                labelLower.startsWith(searchLower)
              )
                return 0.8;
              if (
                valueLower.includes(searchLower) ||
                labelLower.includes(searchLower)
              )
                return 0.5;
              return 0;
            }}
          >
            <CommandInput
              placeholder="Search keys..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No keys found.</CommandEmpty>
              {KEY_CATEGORIES.map((category) => {
                const categoryKeys = availableKeys.filter(
                  (k) => k.category === category
                );
                if (categoryKeys.length === 0) return null;

                return (
                  <CommandGroup key={category} heading={category}>
                    {categoryKeys.map((key) => (
                      <CommandItem
                        key={key.value}
                        value={key.value}
                        onSelect={() => addKey(key.value)}
                      >
                        <code className="w-10 text-xs bg-bg-tertiary px-1 py-0.5 rounded font-mono">
                          {key.value}
                        </code>
                        <span className="truncate">{key.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedKeys.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedKeys.map((key) => (
            <Badge key={key} variant="secondary" className="gap-1 pr-1">
              <code className="font-mono text-xs">{key}</code>
              <button
                type="button"
                onClick={() => removeKey(key)}
                className="ml-0.5 rounded-full hover:bg-secondary/80 p-0.5"
                aria-label={`Remove ${key}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
