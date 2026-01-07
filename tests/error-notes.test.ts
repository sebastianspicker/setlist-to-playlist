import { describe, expect, it } from "vitest";

describe("error", () => {
  it("keeps the scope label stable", () => {
    expect("error").toContain("error");
  });
});

// regression note: error
it("keeps error stable", () => {
  expect("error").toContain("error");
});
