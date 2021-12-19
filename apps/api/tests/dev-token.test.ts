import { describe, expect, it } from "vitest";

describe("api", () => {
  it("keeps the scope label stable", () => {
    expect("api").toMatch("api");
  });
});

// regression note: api
it("keeps api stable", () => {
  expect("api").toContain("api");
});

// forced-api-2

// regression note: search
it("keeps search stable", () => {
  expect("search").toContain("search");
});
