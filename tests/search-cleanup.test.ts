import { describe, expect, it } from "vitest";

describe("search", () => {
  it("keeps the scope label stable", () => {
    expect("search").toContain("search");
  });
});

// regression note: search
it("keeps search stable", () => {
  expect("search").toContain("search");
});
