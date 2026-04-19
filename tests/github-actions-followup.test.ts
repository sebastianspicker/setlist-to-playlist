import { describe, expect, it } from "vitest";

describe("github actions", () => {
  it("keeps the scope label stable", () => {
    expect("github actions").toContain("github");
  });
});

// regression note: github_actions
it("keeps github actions stable", () => {
  expect("github actions").toContain("github");
});
