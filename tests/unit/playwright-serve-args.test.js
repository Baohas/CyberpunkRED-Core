import { describe, expect, it } from "vitest";

import { parseServeArgs } from "../../tools/playwright/bin/serve-args.mjs";

describe("playwright:serve args", () => {
  it("defaults to fresh mode", () => {
    expect(parseServeArgs([])).toEqual({ mode: "fresh" });
  });

  it("accepts an existing world id", () => {
    expect(parseServeArgs(["--world", "night-city"])).toEqual({
      mode: "world",
      world: "night-city",
    });
  });

  it("accepts an archive path", () => {
    expect(parseServeArgs(["--archive", "world.zip"])).toEqual({
      mode: "archive",
      archive: "world.zip",
    });
  });

  it("rejects mutually exclusive modes", () => {
    expect(() =>
      parseServeArgs(["--world", "a", "--archive", "b.zip"]),
    ).toThrow(/mutually exclusive/);
  });

  it("rejects missing and unknown args", () => {
    expect(() => parseServeArgs(["--world"])).toThrow(/Missing value/);
    expect(() => parseServeArgs(["--wat"])).toThrow(/Unknown argument/);
  });
});
