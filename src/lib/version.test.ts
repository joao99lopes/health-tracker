import assert from "node:assert/strict";
import { test } from "node:test";
import { displayVersion } from "./version.ts";

test("a full commit SHA is shortened to seven characters", () => {
  assert.equal(
    displayVersion("78dc2fe0123456789abcdef0123456789abcdef0"),
    "78dc2fe",
  );
});

test("anything else is shown as given, trimmed", () => {
  assert.equal(displayVersion(" v1.2.0 "), "v1.2.0");
  assert.equal(displayVersion("78dc2fe"), "78dc2fe");
});

test("no version is null, not an empty label", () => {
  assert.equal(displayVersion(null), null);
  assert.equal(displayVersion("  "), null);
});
