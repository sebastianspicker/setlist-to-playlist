"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Visual variant. */
  variant?: ButtonVariant;
  /** When true, disables the button and sets aria-busy. */
  loading?: boolean;
  /** Content shown when loading is true. Default: "Loading…" */
  loadingChildren?: ReactNode;
  children: ReactNode;
}

/**
 * Design-system button with primary/secondary variant and optional loading state.
 * Use for consistent CTAs; consumer can pass className (e.g. "premium-button") and style overrides.
 */
export function Button({
  variant = "primary",
  loading = false,
  loadingChildren = "Loading…",
  children,
  disabled,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const variantClass = variant === "secondary" ? "premium-button secondary" : "premium-button";
  return (
    <button
      type={type}
      className={className ?? variantClass}
      disabled={disabled ?? loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? loadingChildren : children}
    </button>
  );
}
