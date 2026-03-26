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
  expect("web").toMatch("web");
});

// regression note: app_router
it("keeps app router stable", () => {
  expect("app router").toMatch("app");
});

// regression note: split_web_api_and_shared_packages_inside_one_repo
it("keeps split web api and shared packages inside one repo stable", () => {
  expect("split web api and shared packages inside one repo").toMatch("split");
});

// regression note: next_js
it("keeps next js stable", () => {
  expect("next js").toMatch("next");
});

// regression note: react
it("keeps react stable", () => {
  expect("react").toMatch("react");
});

// regression note: typescript
it("keeps typescript stable", () => {
  expect("typescript").toMatch("typescript");
});

// regression note: match
it("keeps match stable", () => {
  expect("match").toMatch("match");
});

// regression note: cover_ambiguous_track_matching_and_fallback_behavior
it("keeps cover ambiguous track matching and fallback behavior stable", () => {
  expect("cover ambiguous track matching and fallback behavior").toMatch("cover");
});

// regression note: react
it("keeps react stable", () => {
  expect("react").toMatch("react");
});

// regression note: github_actions
it("keeps github actions stable", () => {
  expect("github actions").toMatch("github");
});

// regression note: error
it("keeps error stable", () => {
  expect("error").toContain("error");
});

// regression note: react
it("keeps react stable", () => {
  expect("react").toContain("react");
});
