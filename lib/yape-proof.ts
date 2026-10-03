export const YAPE_PROOF_MAX_BYTES = 5 * 1024 * 1024;

export function yapeProofExtension(bytes: Uint8Array, mime: string) {
  if (
    mime === "image/jpeg" &&
    bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  ) return "jpg";
  if (
    mime === "image/png" &&
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value)
  ) return "png";
  if (
    mime === "image/webp" &&
    bytes.length >= 12 &&
    [0x52, 0x49, 0x46, 0x46].every((value, index) => bytes[index] === value) &&
    [0x57, 0x45, 0x42, 0x50].every((value, index) => bytes[index + 8] === value)
  ) return "webp";
  return null;
}
