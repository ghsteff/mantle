import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { CheckIcon, ChevronsUpDown, KeyboardIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ALL_KANATA_KEYS, KEY_CATEGORIES } from "../../kanata-keys";
import { describeKeyOutput } from "@/components/keyboard/utils/format-action";
import {
  MODIFIER_LABELS,
  MODIFIER_ORDER,
  MODIFIER_SHORT_LABELS,
  MODIFIER_SYMBOLS,
  TRANSPARENT,
  buildKeyOutput,
  modifierNameOf,
  parseKeyOutput,
  type ModifierName,
} from "@/kanata/key-action";

interface KeyPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Offer "Base layer key" in the list; only meaningful on non-base layers. */
  allowTransparent?: boolean;
  "aria-labelledby"?: string;
}

const LEFT_MODIFIER: Record<ModifierName, string> = {
  ctrl: "lctl",
  alt: "lalt",
  shift: "lsft",
  cmd: "lmet",
};

const CODE_TO_KANATA: Record<string, string> = {
  Escape: "esc",
  Backquote: "grv",
  Minus: "-",
  Equal: "=",
  Backspace: "bspc",
  Tab: "tab",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  CapsLock: "caps",
  Semicolon: ";",
  Quote: "'",
  Enter: "ret",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: "spc",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Insert: "ins",
  Delete: "del",
  Home: "home",
  End: "end",
  PageUp: "pgup",
  PageDown: "pgdn",
  ControlLeft: "lctl",
  ControlRight: "rctl",
  ShiftLeft: "lsft",
  ShiftRight: "rsft",
  AltLeft: "lalt",
  AltRight: "ralt",
  MetaLeft: "lmet",
  MetaRight: "rmet",
};

function kanataKeyFromCode(code: string): string | null {
  if (CODE_TO_KANATA[code]) return CODE_TO_KANATA[code];
  const letter = code.match(/^Key([A-Z])$/);
  if (letter) return letter[1].toLowerCase();
  const digit = code.match(/^Digit(\d)$/);
  if (digit) return digit[1];
  const fn = code.match(/^F(\d{1,2})$/);
  if (fn) return `f${fn[1]}`;
  return null;
}

function heldModifiers(event: KeyboardEvent): string[] {
  return [
    event.ctrlKey && "lctl",
    event.altKey && "lalt",
    event.shiftKey && "lsft",
    event.metaKey && "lmet",
  ].filter((modifier): modifier is string => Boolean(modifier));
}

/** Waits for the next key press (or a lone modifier tap) and reports it as a key output. */
function useKeyRecorder(
  isRecording: boolean,
  onRecord: (value: string) => void,
  onCancel: () => void,
  toggleRef: RefObject<HTMLElement | null>,
) {
  const callbacksRef = useRef({ onRecord, onCancel });
  callbacksRef.current = { onRecord, onCancel };

  useEffect(() => {
    if (!isRecording) return;
    let loneModifier: string | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const key = kanataKeyFromCode(event.code);
      if (!key) return;
      if (modifierNameOf(key)) {
        loneModifier = key;
        return;
      }
      loneModifier = null;
      const modifiers = heldModifiers(event);
      callbacksRef.current.onRecord(buildKeyOutput(modifiers, [key]));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const key = kanataKeyFromCode(event.code);
      if (key && key === loneModifier) callbacksRef.current.onRecord(key);
    };

    // The record button toggles recording off itself; any other click cancels.
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && toggleRef.current?.contains(event.target)) return;
      callbacksRef.current.onCancel();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isRecording, toggleRef]);
}

export function KeyPicker({
  value,
  onChange,
  placeholder = "Choose a key…",
  allowTransparent = false,
  "aria-labelledby": labelledBy,
}: KeyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const listId = useId();
  const recordButtonRef = useRef<HTMLButtonElement>(null);

  const { modifiers, keys, expression } = parseKeyOutput(value);
  const activeModifiers = new Set(modifiers.map(modifierNameOf));
  const isSpecial = value === TRANSPARENT || value === "XX";

  useKeyRecorder(
    isRecording,
    (recorded) => {
      setIsRecording(false);
      onChange(recorded);
    },
    () => setIsRecording(false),
    recordButtonRef,
  );

  const chooseKey = (key: string) => {
    setOpen(false);
    setSearch("");
    if (key === TRANSPARENT || key === "XX" || key.startsWith("(")) {
      onChange(key);
      return;
    }
    // Modifier toggles add to a chosen key; with no key chosen, a pick replaces the value.
    const keptModifiers = keys.length > 0 && !isSpecial ? modifiers : [];
    if (modifierNameOf(key)) {
      onChange(buildKeyOutput([...keptModifiers.filter((m) => modifierNameOf(m) !== modifierNameOf(key)), key], []));
      return;
    }
    onChange(buildKeyOutput(keptModifiers, [key]));
  };

  const toggleModifier = (name: ModifierName) => {
    const base = isSpecial || expression ? { modifiers: [], keys: [] } : { modifiers, keys };
    const nextModifiers = activeModifiers.has(name) && !isSpecial
      ? base.modifiers.filter((m) => modifierNameOf(m) !== name)
      : [...base.modifiers, LEFT_MODIFIER[name]];
    onChange(buildKeyOutput(nextModifiers, base.keys));
  };

  const searchText = search.trim().toLowerCase();
  const options = ALL_KANATA_KEYS.filter((option) => {
    if (option.value === TRANSPARENT && !allowTransparent) return false;
    if (!searchText) return true;
    return (
      option.value.toLowerCase().includes(searchText) ||
      option.label.toLowerCase().includes(searchText)
    );
  }).sort((a, b) => {
    if (!searchText) return 0;
    const rank = (option: typeof a) =>
      option.value.toLowerCase() === searchText || option.label.toLowerCase() === searchText
        ? 0
        : option.label.toLowerCase().startsWith(searchText)
          ? 1
          : 2;
    return rank(a) - rank(b);
  });

  const triggerText =
    value === TRANSPARENT
      ? "Same as base layer"
      : value === "XX"
        ? "Nothing (key disabled)"
        : value
          ? describeKeyOutput(value)
          : null;
  const selectedValue = keys.length === 1 && modifiers.length === 0 ? keys[0] : value;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-labelledby={labelledBy}
              className={cn(
                "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-left text-xs outline-none transition-colors",
                "hover:bg-muted focus-visible:border-white/30",
                open && "border-white/25",
              )}
            >
              {isRecording ? (
                <span className="text-foreground animate-pulse">Press a key…</span>
              ) : triggerText ? (
                <>
                  <span className="truncate font-medium text-foreground">{triggerText}</span>
                  {!value.startsWith("(") && !isSpecial && (
                    <code className="ml-auto shrink-0 truncate font-mono text-[10px] text-muted-foreground/70">
                      {value}
                    </code>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronsUpDown className={cn("size-3.5 shrink-0 opacity-50", (!triggerText || value.startsWith("(") || isSpecial) && "ml-auto")} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Search keys…" value={search} onValueChange={setSearch} />
              <CommandList id={listId}>
                <CommandEmpty>No keys match “{search}”.</CommandEmpty>
                {KEY_CATEGORIES.map((category) => {
                  const categoryKeys = options.filter((option) => option.category === category);
                  if (categoryKeys.length === 0) return null;
                  return (
                    <CommandGroup key={category} heading={category}>
                      {categoryKeys.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={() => chooseKey(option.value)}
                        >
                          <CheckIcon
                            className={cn(
                              "size-3 shrink-0",
                              selectedValue === option.value ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="truncate">{option.label}</span>
                          <code className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                            {option.value}
                          </code>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={recordButtonRef}
              type="button"
              onClick={() => setIsRecording((recording) => !recording)}
              aria-pressed={isRecording}
              aria-label="Record a key press"
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground outline-none transition-colors",
                "hover:bg-muted hover:text-foreground focus-visible:border-white/30",
                isRecording && "border-white/30 text-foreground",
              )}
            >
              <KeyboardIcon className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{isRecording ? "Press any key, or click to cancel" : "Record a key press"}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex gap-1" role="group" aria-label="Modifiers">
        {MODIFIER_ORDER.map((name) => {
          const isActive = activeModifiers.has(name) && !isSpecial;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={isActive}
              title={MODIFIER_LABELS[name]}
              onClick={() => toggleModifier(name)}
              className={cn(
                "flex h-7 flex-1 items-center justify-center gap-1 rounded-md border text-[11px] outline-none transition-colors",
                "focus-visible:border-white/30",
                isActive
                  ? "border-white/20 bg-white/[0.08] text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <span className="text-xs leading-none">{MODIFIER_SYMBOLS[name]}</span>
              <span>{MODIFIER_SHORT_LABELS[name]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
