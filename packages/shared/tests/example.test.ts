import { describe, it, expect } from "vitest";
import { API_ERROR, isErr, isOk, type Result } from "../src/types/api";
import { SETLIST_FM_BASE_URL } from "../src/utils/constants";
import { getErrorMessage, isErrorLike } from "../src/utils/error";

describe("shared", () => {
  it("exports API_ERROR", () => {
    expect(API_ERROR.UNAUTHORIZED).toBe("UNAUTHORIZED");
  });
  it("exports setlist base URL", () => {
    expect(SETLIST_FM_BASE_URL).toContain("setlist.fm");
  });
});

describe("getErrorMessage", () => {
  it("returns Error message", () => {
    expect(getErrorMessage(new Error("oops"), "fallback")).toBe("oops");
  });
  it("returns fallback for null/undefined", () => {
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
  });
  it("returns String for non-Error value", () => {
    expect(getErrorMessage("string err", "fallback")).toBe("string err");
  });
});

describe("isErrorLike", () => {
  it("returns true for object with string message", () => {
    expect(isErrorLike({ message: "err" })).toBe(true);
  });
  it("returns true for Error instance (has message)", () => {
    expect(isErrorLike(new Error("e"))).toBe(true);
  });
  it("returns false for null, undefined, string, number", () => {
    expect(isErrorLike(null)).toBe(false);
    expect(isErrorLike(undefined)).toBe(false);
    expect(isErrorLike("hi")).toBe(false);
    expect(isErrorLike(42)).toBe(false);
  });
  it("returns false when message is not a string", () => {
    expect(isErrorLike({ message: 123 })).toBe(false);
  });
});

describe("Result / isOk / isErr", () => {
  it("narrows Result with isOk", () => {
    const r: Result<number> = { ok: true, value: 42 };
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(42);
  });
  it("narrows Result with isErr", () => {
    const r: Result<number> = { ok: false, error: "fail" };
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBe("fail");
  });
});
