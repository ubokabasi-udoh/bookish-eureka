"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

function clampToRange(value: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.floor(value), 1), Math.max(1, max));
}

/**
 * Accessible quantity control used on the product page and in the cart. `min` is 1; removing a
 * line is always a separate, explicit action.
 */
export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  disabled = false,
  className,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const button =
    "grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1", className)}
    >
      <button type="button" className={button} onClick={() => onChange(clampToRange(value - 1, max))} disabled={disabled || value <= 1} aria-label={`Decrease ${label.toLowerCase()}`}>
        <Minus aria-hidden className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={Math.max(1, max)}
        value={value}
        disabled={disabled}
        aria-label={`${label} quantity`}
        onChange={(event) => onChange(clampToRange(Number(event.target.value), max))}
        className="w-10 appearance-none border-0 bg-transparent text-center text-sm font-medium tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" className={button} onClick={() => onChange(clampToRange(value + 1, max))} disabled={disabled || value >= max} aria-label={`Increase ${label.toLowerCase()}`}>
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}