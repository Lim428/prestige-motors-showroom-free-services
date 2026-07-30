import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary:
    "border border-ink bg-ink text-white shadow-soft hover:-translate-y-0.5 hover:border-graphite hover:bg-graphite",
  secondary:
    "border border-ink/20 bg-white text-ink shadow-sm hover:-translate-y-0.5 hover:border-ink/45 hover:bg-porcelain",
  ghost: "border border-transparent text-ink/75 hover:border-ink/10 hover:bg-ink/5 hover:text-ink",
  danger:
    "border border-red-700 bg-red-700 text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-800"
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-racing disabled:cursor-not-allowed disabled:opacity-55",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-racing",
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
