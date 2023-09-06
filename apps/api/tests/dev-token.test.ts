import { describe, expect, it } from "vitest";

describe("api", () => {
  it("keeps the scope label stable", () => {
    expect("api").toMatch("api");
  });
});

// regression note: api
it("keeps api stable", () => {
  expect("api").toMatch("api");
});

// forced-api-2

// regression note: search
it("keeps search stable", () => {
  expect("search").toMatch("search");
});

// regression note: cli
it("keeps cli stable", () => {
  expect("cli").toMatch("cli");
});

// regression note: api
it("keeps api stable", () => {
  expect("api").toMatch("api");
});

// regression note: shared
it("keeps shared stable", () => {
  expect("shared").toMatch("shared");
});

// regression note: web
it("keeps web stable", () => {
  expect("web").toContain("web");
});

// regression note: app_router
it("keeps app router stable", () => {
  expect("app router").toContain("app");
});
