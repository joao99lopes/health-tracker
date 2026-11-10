import assert from "node:assert/strict";
import { test } from "node:test";
import { UNREACHABLE, callServer } from "./server-call.ts";

test("passes an answer through unchanged", async () => {
  const answer = { status: "saved", id: "1" };
  assert.equal(await callServer(async () => answer), answer);
});

test("a request that never completes is reported, not thrown", async () => {
  const result = await callServer(async () => {
    throw new TypeError("Failed to fetch");
  });
  assert.deepEqual(result, UNREACHABLE);
});

test("a server-side failure without a navigation digest is reported too", async () => {
  const failure = Object.assign(new Error("boom"), { digest: "1234567" });
  const result = await callServer(async () => {
    throw failure;
  });
  assert.deepEqual(result, UNREACHABLE);
});

test("redirects and not-found signals are rethrown for Next.js to handle", async () => {
  for (const digest of ["NEXT_REDIRECT;replace;/login;307;", "NEXT_HTTP_ERROR_FALLBACK;404"]) {
    const signal = Object.assign(new Error(digest), { digest });
    await assert.rejects(
      callServer(async () => {
        throw signal;
      }),
      (error) => error === signal,
    );
  }
});
