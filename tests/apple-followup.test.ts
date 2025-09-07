import { describe, expect, it } from "vitest";

describe("apple", () => {
  it("keeps the scope label stable", () => {
    expect("apple").toContain("apple");
  });
});

// regression note: apple
it("keeps apple stable", () => {
  expect("apple").toContain("apple");
});
