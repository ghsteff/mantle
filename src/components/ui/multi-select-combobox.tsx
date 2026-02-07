import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
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

interface Option {
  value: string;
  label: string;
}

interface MultiSelectComboboxProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  emptyMessage?: string;
}

export function MultiSelectCombobox({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  className,
  emptyMessage = "No options found.",
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const toggleValue = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setOpen(false);
  };

  const getSelectedLabels = () => {
    const labels = options
      .filter((option) => value.includes(option.value))
      .map((option) => option.label);
    return labels;
  };

  const selectedLabels = getSelectedLabels();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate text-left">
            {value.length > 0
              ? value.length === 1
                ? selectedLabels[0]
                : `${value.length} selected`
              : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value.length > 0 && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggleValue(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface MultiSelectComboboxChipsProps extends MultiSelectComboboxProps {
  chipsClassName?: string;
}

export function MultiSelectComboboxChips({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  className,
  chipsClassName,
  emptyMessage = "No options found.",
}: MultiSelectComboboxChipsProps) {
  const [open, setOpen] = React.useState(false);

  const toggleValue = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeValue = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const getSelectedLabels = () => {
    return options
      .filter((option) => value.includes(option.value))
      .map((option) => ({ value: option.value, label: option.label }));
  };

  const selectedOptions = getSelectedLabels();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex min-h-[38px] w-full flex-wrap items-center gap-1.5 rounded-sm border border-border bg-secondary px-3 py-1.5 text-sm hover:bg-accent",
            className
          )}
          onClick={() => setOpen(true)}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "bg-accent text-foreground flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium",
                  chipsClassName
                )}
              >
                {option.label}
                <X
                  className="h-3 w-3 opacity-70 hover:opacity-100"
                  onClick={(e) => removeValue(option.value, e)}
                />
              </div>
            ))
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggleValue(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
