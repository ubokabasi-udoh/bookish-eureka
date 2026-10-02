import { formatMoney } from "@/domain/money";
import { cn } from "@/lib/utils";

export function Price({ cents, currency, className }: { cents: number; currency: string; className?: string }) {
  return <span className={cn("font-semibold tabular-nums", className)}>{formatMoney(cents, currency)}</span>;
}
