"use client";

export interface SectionTitleProps {
  children: React.ReactNode;
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
      {children}
    </h2>
  );
}
