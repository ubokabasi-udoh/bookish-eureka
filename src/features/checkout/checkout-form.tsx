"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { placeOrderAction } from "@/app/checkout/actions";
import { Button } from "@/components/ui/button";
import type { CartLineInput } from "@/domain/entities";
import { checkoutSchema, type CheckoutFormValues } from "@/domain/schemas/checkout";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/features/cart/cart-store";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none transition-colors placeholder:text-muted focus-visible:border-ink";

function Field({
  id,
  label,
  error,
  hint,
  className,
  registration,
  ...props
}: {
  id: keyof CheckoutFormValues;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  registration: UseFormRegisterReturn;
} & Omit<ComponentProps<"input">, "id" | "className">) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {props.required ? <span className="ml-0.5 text-danger" aria-hidden>*</span> : <span className="ml-2 text-xs font-normal text-muted">Optional</span>}
      </label>
      <input
        id={id}
        {...registration}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(inputClass, error && "border-danger")}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({
  items,
  defaults,
}: {
  items: CartLineInput[];
  defaults: { customerName: string; customerEmail: string };
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: {
      customerName: defaults.customerName,
      customerEmail: defaults.customerEmail,
      customerPhone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
    },
  });

  async function onSubmit(values: CheckoutFormValues) {
    setFormError(null);
    if (items.length === 0) {
      setFormError("Your cart is empty. Add something before checking out.");
      return;
    }

    const result = await placeOrderAction({ customer: values, items });
    if (result.ok) {
      useCartStore.getState().clear();
      router.push(`/orders/${result.orderId}`);
      return;
    }

    for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
      const message = messages[0];
      if (!message) continue;
      if (key.startsWith("customer.")) {
        setError(key.slice("customer.".length) as keyof CheckoutFormValues, { message });
      }
    }
    setFormError(result.message);
    if (result.code === "AUTH_REQUIRED") {
      router.push(`/sign-in?next=${encodeURIComponent("/checkout")}`);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {formError && (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}

      <fieldset className="space-y-4" disabled={isSubmitting}>
        <legend className="mb-2 font-serif text-lg font-semibold">Contact</legend>
        <Field id="customerName" label="Full name" required registration={register("customerName")} error={errors.customerName?.message} autoComplete="name" placeholder="Ada Lovelace" />
        <Field id="customerEmail" label="Email" required type="email" registration={register("customerEmail")} error={errors.customerEmail?.message} autoComplete="email" placeholder="ada@example.com" hint="Your confirmation is sent here." />
        <Field id="customerPhone" label="Phone" type="tel" registration={register("customerPhone")} error={errors.customerPhone?.message} autoComplete="tel" placeholder="+1 555 0100" />
      </fieldset>

      <fieldset className="space-y-4" disabled={isSubmitting}>
        <legend className="mb-2 font-serif text-lg font-semibold">Shipping address</legend>
        <Field id="addressLine1" label="Address" required registration={register("addressLine1")} error={errors.addressLine1?.message} autoComplete="address-line1" placeholder="1 Analytical Street" />
        <Field id="addressLine2" label="Apartment, suite, etc." registration={register("addressLine2")} error={errors.addressLine2?.message} autoComplete="address-line2" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="city" label="City" required registration={register("city")} error={errors.city?.message} autoComplete="address-level2" />
          <Field id="region" label="State / region" required registration={register("region")} error={errors.region?.message} autoComplete="address-level1" />
          <Field id="postalCode" label="Postal code" required registration={register("postalCode")} error={errors.postalCode?.message} autoComplete="postal-code" />
        </div>
        <Field id="country" label="Country" required registration={register("country")} error={errors.country?.message} autoComplete="country-name" />
      </fieldset>

      <div className="flex flex-col-reverse items-center gap-4 border-t border-line pt-6 sm:flex-row sm:justify-between">
        <p className="text-xs text-muted">Demo store: no payment is taken and nothing is shipped.</p>
        <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Placing your order…" : "Place order"}
        </Button>
      </div>
    </form>
  );
}