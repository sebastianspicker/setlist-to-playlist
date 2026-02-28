"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Button } from "@repo/ui";
import type { ButtonVariant } from "@repo/ui";

export interface LoadingButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Whether an async action is in progress. Disables button and shows loadingChildren. */
  loading?: boolean;
  /** Content when loading is true. Default: "Loading…" */
  loadingChildren?: ReactNode;
  children: ReactNode;
  /** Optional style overrides. */
  style?: CSSProperties;
  variant?: ButtonVariant;
}

/**
 * Primary action button with loading state: disables, sets aria-busy, and shows loadingChildren.
 * Uses the shared @repo/ui Button primitive for consistent behavior and variants.
 */
export function LoadingButton({
  loading = false,
  loadingChildren = "Loading…",
  children,
  variant = "primary",
  disabled,
  style,
  className,
  type = "button",
  ...rest
}: LoadingButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      className={className}
      loading={loading}
      loadingChildren={loadingChildren}
      disabled={disabled}
      style={style}
      {...rest}
    >
      {children}
    </Button>
  );
}
