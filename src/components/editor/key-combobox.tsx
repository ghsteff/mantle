import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
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

interface KeyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Autocomplete combobox for selecting Kanata key codes.
 */
export function KeyCombobox({
  value,
  onChange,
  placeholder = "Select key...",
}: KeyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Get display label for current value
  const currentOption = findKeyOption(value);
  const displayValue = currentOption?.label || value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-mono"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value ? displayValue : placeholder}
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

            // Exact match gets highest score
            if (valueLower === searchLower) return 1;
            // Starts with search
            if (
              valueLower.startsWith(searchLower) ||
              labelLower.startsWith(searchLower)
            )
              return 0.8;
            // Contains search
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
              const categoryKeys = ALL_KANATA_KEYS.filter(
                (k) => k.category === category
              );
              if (categoryKeys.length === 0) return null;

              return (
                <CommandGroup key={category} heading={category}>
                  {categoryKeys.map((key) => (
                    <CommandItem
                      key={key.value}
                      value={key.value}
                      onSelect={() => {
                        onChange(key.value);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={value === key.value ? "bg-accent" : ""}
                    >
                      <code className="w-12 text-xs bg-secondary px-1.5 py-0.5 rounded font-mono text-center">
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
  );
}
