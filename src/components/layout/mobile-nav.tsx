"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
}

/** Disclosure-style navigation for small screens. Closes on Escape, on link click and on route change. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((value) => !value)}
        className="grid size-10 place-items-center rounded-full border border-line bg-surface transition-colors hover:border-ink"
      >
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="absolute inset-x-0 top-full border-b border-line bg-canvas p-4 shadow-lg"
        >
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-base font-medium hover:bg-brand-soft"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <form action="/shop" role="search" className="relative mt-3" onSubmit={() => setOpen(false)}>
            <label htmlFor="mobile-search" className="sr-only">
              Search products
            </label>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder="Search products"
              maxLength={80}
              className="h-11 w-full rounded-full border border-line bg-surface pl-9 pr-4 text-sm placeholder:text-muted"
            />
          </form>
        </nav>
      )}
    </div>
  );
}