export function createSharedSummary() {
  return { scope: "shared", status: "ready" };
}

// current lane: shared
export function sharedTask() {
  return { scope: "shared", status: "ready" };
}
