import test from "node:test";
import assert from "node:assert/strict";
import { yapeProofExtension, YAPE_PROOF_MAX_BYTES } from "../lib/yape-proof";

test("accepts only image bytes matching the declared receipt format", () => {
  assert.equal(yapeProofExtension(Uint8Array.from([0xff, 0xd8, 0xff]), "image/jpeg"), "jpg");
  assert.equal(yapeProofExtension(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), "png");
  assert.equal(yapeProofExtension(Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]), "image/webp"), "webp");
  assert.equal(yapeProofExtension(Uint8Array.from([0x25,0x50,0x44,0x46]), "image/png"), null);
  assert.equal(yapeProofExtension(Uint8Array.from([0xff,0xd8,0xff]), "image/svg+xml"), null);
  assert.equal(YAPE_PROOF_MAX_BYTES, 5 * 1024 * 1024);
});
