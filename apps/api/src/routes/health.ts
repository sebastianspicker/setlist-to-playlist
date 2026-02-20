/**
 * Simple health check route handler to verify that the API is running and responsive.
 * Returns a basic JSON object with the current server timestamp.
 */
export function handleHealth(): { status: 'ok'; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
