import type { CSSProperties } from "react";

/**
 * Shared layout styles for consistent main content and primary CTAs.
 * Use for page containers and primary action buttons to avoid duplication.
 */
export const mainContainerStyle: CSSProperties = {
  padding: "2rem",
  maxWidth: "40rem",
  margin: "0 auto",
  minWidth: 0,
};

export const primaryButtonStyle: CSSProperties = {
  padding: "0.5rem 1rem",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};
