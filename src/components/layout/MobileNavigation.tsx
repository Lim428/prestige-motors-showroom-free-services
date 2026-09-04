"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

type NavigationItem = {
  label: string;
  href: string;
};

export function MobileNavigation({ items }: { items: NavigationItem[] }) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const closeAndReturnFocus = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndReturnFocus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeAndReturnFocus, isOpen]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label={isOpen ? "Close primary navigation" : "Open primary navigation"}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => (isOpen ? closeAndReturnFocus() : setIsOpen(true))}
        className="grid h-11 w-11 place-items-center border border-ink/20 bg-white text-ink transition hover:border-ink hover:bg-smoke focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing sm:h-12 sm:w-12"
      >
        {isOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close primary navigation"
            onClick={closeAndReturnFocus}
            className="fixed inset-x-0 bottom-0 top-[72px] z-40 cursor-default bg-ink/45 lg:hidden"
          />
          <nav
            ref={panelRef}
            id={panelId}
            aria-label="Mobile primary navigation"
            className="fixed inset-x-0 top-[72px] z-50 border-b-4 border-racing bg-white p-4 shadow-[0_20px_45px_rgba(9,9,9,0.18)] lg:hidden"
          >
            <div className="grid divide-y divide-ink/15 border-y border-ink/15">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-14 items-center justify-between px-2 font-display text-xl font-black uppercase tracking-[0.04em] text-ink transition hover:bg-smoke hover:text-racing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-racing"
                >
                  {item.label}
                  <ArrowRight className="h-5 w-5 text-racing" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
