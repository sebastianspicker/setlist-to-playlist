"use client";

import type { CSSProperties } from "react";

export interface StatusTextProps {
  children: React.ReactNode;
  /** Optional style. Defaults include polite live region and readable color. */
  style?: CSSProperties;
  className?: string;
}

/**
 * Accessible status message for loading and progress updates.
 * Uses role="status" and aria-live="polite" so assistive tech announces changes.
 */
export function StatusText({ children, style, className }: StatusTextProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={className}
      style={{
        color: "var(--text-muted)",
        fontSize: "0.9em",
        margin: 0,
        ...style,
      }}
    >
      {children}
    </p>
  );
}
