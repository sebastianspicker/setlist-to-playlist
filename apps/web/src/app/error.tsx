"use client";

import { useEffect } from "react";
import { getErrorMessage } from "@repo/shared";
import { ErrorBoundaryView } from "@/components/ErrorBoundaryView";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = getErrorMessage(error, "An error occurred. You can try again.");

  return <ErrorBoundaryView message={message} onReset={reset} />;
}
