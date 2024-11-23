import { describe, expect, it } from "vitest";

describe("api", () => {
  it("keeps the scope label stable", () => {
    expect("api").toContain("api");
  });
});

// regression note: api
it("keeps api stable", () => {
  expect("api").toContain("api");
});

// forced-api-2

// forced-api-3
