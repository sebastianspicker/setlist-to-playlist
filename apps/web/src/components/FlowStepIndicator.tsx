"use client";

interface FlowStepIndicatorProps {
  step: number;
  total: number;
  label?: string;
}

export function FlowStepIndicator({ step, total, label }: FlowStepIndicatorProps) {
  return (
    <p role="status" aria-live="polite" className="step-indicator">
      Step {step} of {total}
      {label ? ` · ${label}` : ""}
    </p>
  );
}
