"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  // Modo simples (único valor)
  value?: string;
  onChange?: (value: string) => void;
  // Modo múltiplo (array de valores)
  multiple?: boolean;
  values?: string[];
  onChangeValues?: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsMessage?: string;
  disabled?: boolean;
}

export function Combobox({ 
  options, 
  value, 
  onChange, 
  multiple = false,
  values = [],
  onChangeValues,
  placeholder,
  searchPlaceholder,
  noResultsMessage,
  disabled = false
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const isSelected = (val: string) => {
    if (!multiple) return value === val
    return values.includes(val)
  }

  const handleSelect = (currentValue: string) => {
    if (disabled) return
    if (!multiple) {
      if (!onChange) return
      onChange(currentValue === value ? "" : currentValue)
      setOpen(false)
      return
    }

    if (!onChangeValues) return
    // Suporte ao item "Todos" como limpador
    if (currentValue === "__ALL__") {
      onChangeValues([])
      return
    }

    const next = values.includes(currentValue)
      ? values.filter(v => v !== currentValue)
      : [...values, currentValue]
    onChangeValues(next)
  }

  const triggerLabel = () => {
    if (!multiple) {
      return value
        ? options.find((option) => option.value === value)?.label
        : placeholder || "Select option..."
    }
    if (!values || values.length === 0) {
      return placeholder || "Selecionar opções..."
    }
    const labels = values
      .map(v => options.find(o => o.value === v)?.label)
      .filter(Boolean) as string[]
    if (labels.length <= 2) return labels.join(", ")
    const [a, b, ...rest] = labels
    return `${a}, ${b} +${rest.length}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {triggerLabel()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder || "Search..."} />
            <CommandList>
              <CommandEmpty>{noResultsMessage || "No results found."}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => handleSelect(currentValue)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected(option.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  )
}