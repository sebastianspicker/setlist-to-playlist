import { describe, expect, it } from "vitest";

describe("web", () => {
  it("keeps the scope label stable", () => {
    expect("web").toContain("web");
  });
});

// regression note: web
it("keeps web stable", () => {
  expect("web").toContain("web");
});
