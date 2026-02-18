import { useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { ALL_KANATA_KEYS, KEY_CATEGORIES } from "../../kanata-keys";

interface TerminalKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function parseMultiKeys(value: string): string[] {
  if (!value) return [];
  const multiMatch = value.match(/\(multi\s+(.+)\)/);
  if (multiMatch) {
    return multiMatch[1].split(/\s+/).filter(Boolean);
  }
  if (value && !value.startsWith("(")) {
    return [value];
  }
  return [];
}

function buildMultiKeys(keys: string[]): string {
  if (keys.length === 0) return "";
  if (keys.length === 1) return keys[0];
  return `(multi ${keys.join(" ")})`;
}

export function TerminalKeyInput({
  value,
  onChange,
  placeholder = "Select key...",
}: TerminalKeyInputProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const keys = parseMultiKeys(value);

  const toggleKey = (keyValue: string) => {
    if (keys.includes(keyValue)) {
      const newKeys = keys.filter((k) => k !== keyValue);
      onChange(buildMultiKeys(newKeys));
    } else {
      const newKeys = [...keys, keyValue];
      onChange(buildMultiKeys(newKeys));
    }
  };

  const removeKey = (keyValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newKeys = keys.filter((k) => k !== keyValue);
    onChange(buildMultiKeys(newKeys));
  };

  const clearAll = () => {
    onChange("");
    setOpen(false);
  };

  const getSelectedOptions = () => {
    return keys
      .map((keyValue) => {
        const keyOption = ALL_KANATA_KEYS.find((k) => k.value === keyValue);
        return keyOption
          ? { value: keyOption.value, label: keyOption.label }
          : { value: keyValue, label: keyValue };
      })
      .filter(Boolean);
  };

  const selectedOptions = getSelectedOptions();

  // Filter keys based on search
  const filteredKeys = searchValue
    ? ALL_KANATA_KEYS.filter((k) => {
        const search = searchValue.toLowerCase();
        return (
          k.value.toLowerCase().includes(search) ||
          k.label.toLowerCase().includes(search)
        );
      })
    : ALL_KANATA_KEYS;

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "flex min-h-[32px] w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-muted cursor-text",
              open && "ring-1 ring-accent/30 border-accent/50"
            )}
            onClick={() => setOpen(true)}
          >
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground font-mono">{placeholder}</span>
            ) : (
              selectedOptions.map((option) => (
                <div
                  key={option.value}
                  className="bg-accent/15 text-accent flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium font-mono"
                >
                  <code className="text-xs">{option.value}</code>
                  <X
                    className="h-3 w-3 opacity-70 hover:opacity-100"
                    onClick={(e) => removeKey(option.value, e)}
                  />
                </div>
              ))
            )}
            <div className="ml-auto flex items-center gap-1">
              {selectedOptions.length > 0 && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search keys..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No keys found.</CommandEmpty>
              {KEY_CATEGORIES.map((category) => {
                const categoryKeys = filteredKeys.filter(
                  (k) => k.category === category
                );
                if (categoryKeys.length === 0) return null;

                return (
                  <CommandGroup key={category} heading={category}>
                    {categoryKeys.map((key) => (
                      <CommandItem
                        key={key.value}
                        value={key.value}
                        onSelect={() => toggleKey(key.value)}
                        className="font-mono"
                      >
                        <code className="text-xs mr-2">{key.value}</code>
                        <span className="text-muted-foreground">{key.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
