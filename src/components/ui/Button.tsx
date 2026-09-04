import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary:
    "border border-ink bg-ink text-white hover:border-copper hover:bg-copper",
  secondary:
    "border border-ink/25 bg-white text-ink hover:border-ink hover:bg-smoke",
  ghost: "border border-transparent text-ink/75 hover:border-ink/20 hover:bg-smoke hover:text-ink",
  danger:
    "border border-red-700 bg-red-700 text-white hover:bg-red-800"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: ReactNode;
};

export function Button({
  className,
  variant = "primary",
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] transition focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-copper disabled:cursor-not-allowed disabled:opacity-55",
        variantClass[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  icon?: ReactNode;
};

export function ButtonLink({
  className,
  variant = "primary",
  icon,
  children,
  href,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] transition focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-copper",
        variantClass[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}
