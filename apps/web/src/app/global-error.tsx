"use client";

import { getErrorMessage } from "@repo/shared";
import { ErrorBoundaryView } from "@/components/ErrorBoundaryView";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = getErrorMessage(error, "An unexpected error occurred. You can try again.");

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <ErrorBoundaryView message={message} onReset={() => reset()} />
      </body>
    </html>
  );
}
