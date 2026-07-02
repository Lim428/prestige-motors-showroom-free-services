import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-ink text-white shadow-panel hover:-translate-y-0.5 hover:bg-graphite",
  secondary:
    "border border-ink/10 bg-white text-ink shadow-sm hover:-translate-y-0.5 hover:border-ink/25",
  ghost: "text-ink/70 hover:bg-ink/5 hover:text-ink",
  danger:
    "bg-red-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-700"
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
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
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
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition",
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
